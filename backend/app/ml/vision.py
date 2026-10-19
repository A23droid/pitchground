from __future__ import annotations

import logging
from contextlib import ExitStack
from pathlib import Path
import cv2
import numpy as np
from app.config import BASE_DIR
from app.ml.types import VisualSignals
from app.storage.media import resolve_local_path

logger = logging.getLogger(__name__)

class VisionExtractor:
    """Measure face/iris, upper-body and hand landmarks from sampled video frames.

    Face blendshapes describe observed expressions, not psychological stress.
    Missing/occluded subjects produce unavailable measurements.
    """
    def __init__(self, sample_fps: float = 5):
        self.sample_fps = sample_fps
        self.model_dir = BASE_DIR / "models"

    def extract(self, video_path: str) -> tuple[VisualSignals | None, float | None]:
        path = Path(resolve_local_path(video_path) or video_path)
        assets = [self.model_dir / f"{name}_landmarker.task" for name in ("face", "pose", "hand")]
        if not path.is_file() or not all(p.is_file() for p in assets):
            logger.warning("Video or MediaPipe model assets unavailable")
            return None, None
        cap = cv2.VideoCapture(str(path))
        if not cap.isOpened():
            return None, None
        try:
            import mediapipe as mp
            vision = mp.tasks.vision
            base = mp.tasks.BaseOptions
            with ExitStack() as stack:
                face = stack.enter_context(vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
                    base_options=base(model_asset_path=str(assets[0])), running_mode=vision.RunningMode.VIDEO,
                    output_face_blendshapes=True)))
                pose = stack.enter_context(vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
                    base_options=base(model_asset_path=str(assets[1])), running_mode=vision.RunningMode.VIDEO)))
                hand = stack.enter_context(vision.HandLandmarker.create_from_options(vision.HandLandmarkerOptions(
                    base_options=base(model_asset_path=str(assets[2])), running_mode=vision.RunningMode.VIDEO, num_hands=2)))
                fps = cap.get(cv2.CAP_PROP_FPS)
                if not np.isfinite(fps) or fps <= 0: return None, None
                interval = max(1, round(fps / self.sample_fps))
                gaze, head, body_motion, hand_motion = [], [], [], []
                prev_body, prev_hands = None, {}
                blendshape_samples = {}
                sampled = face_frames = hand_frames = 0
                idx = 0
                while True:
                    ok, frame = cap.read()
                    if not ok: break
                    if idx % interval:
                        idx += 1
                        continue
                    sampled += 1
                    timestamp = round(idx / fps * 1000)
                    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                    f = face.detect_for_video(image, timestamp)
                    p = pose.detect_for_video(image, timestamp)
                    h = hand.detect_for_video(image, timestamp)
                    if f.face_landmarks:
                        face_frames += 1
                        lm = f.face_landmarks[0]
                        eye_positions = []
                        for iris, inner, outer in [(468,33,133),(473,362,263)]:
                            a, b = lm[inner], lm[outer]
                            axis = np.array([b.x-a.x,b.y-a.y])
                            offset = np.array([lm[iris].x-a.x,lm[iris].y-a.y])
                            eye_positions.append(float(np.dot(offset,axis)/max(np.dot(axis,axis),1e-8)))
                        gaze.append(float(any(x<.32 or x>.68 for x in eye_positions)))
                        # Nose position relative to eye midpoint and chin, normalized within face.
                        eye_y = (lm[33].y+lm[263].y)/2
                        ratio = (lm[1].y-eye_y)/max(lm[152].y-eye_y,1e-6)
                        head.append(float(ratio>.65))
                        if f.face_blendshapes:
                            shape = {c.category_name:c.score for c in f.face_blendshapes[0]}
                            for name,value in shape.items(): blendshape_samples.setdefault(name,[]).append(float(value))
                    if p.pose_landmarks:
                        lm = p.pose_landmarks[0]
                        indices = [11,12,13,14,15,16]
                        if all(lm[i].visibility>.5 for i in indices):
                            points = np.array([[lm[i].x,lm[i].y] for i in indices])
                            if prev_body is not None:
                                body_motion.append(float(np.linalg.norm(points-prev_body,axis=1).mean()))
                            prev_body = points
                        else: prev_body = None
                    else: prev_body = None
                    current_hands = {}
                    for landmarks, handedness in zip(h.hand_landmarks,h.handedness):
                        label = handedness[0].category_name
                        points = np.array([[lm.x,lm.y] for lm in landmarks])
                        current_hands[label] = points
                        if label in prev_hands:
                            hand_motion.append(float(np.linalg.norm(points-prev_hands[label],axis=1).mean()))
                    if current_hands: hand_frames += 1
                    prev_hands = current_hands
                    idx += 1
                face_covered = face_frames/max(1,sampled) >= .5
                if not face_covered and not body_motion and not hand_motion:
                    return None, None
                freeze = float(np.mean(np.array(body_motion)<.003)) if body_motion else None
                gestures = min(1,float(np.mean(hand_motion))*20) if hand_motion else None
                facial_tension = None
                blendshapes = {name:float(np.mean(values)) for name,values in blendshape_samples.items()}
                # Facial expressions alone cannot establish psychological stress.
                tension = None  # No calibrated stress model is installed.
                return VisualSignals(gaze_away=float(np.mean(gaze)) if gaze and face_covered else None,head_down=float(np.mean(head)) if head and face_covered else None,
                    freeze_ratio=freeze,gesture_energy=gestures,stress_score=tension,
                    upper_body_motion=float(np.mean(body_motion)) if body_motion else None, facial_tension=facial_tension,facial_blendshapes=blendshapes,
                    face_detection_ratio=face_frames/max(1,sampled),hand_detection_ratio=hand_frames/max(1,sampled)), tension*100 if tension is not None else None
        except Exception:
            logger.exception("Landmark extraction failed")
            return None, None
        finally:
            cap.release()
