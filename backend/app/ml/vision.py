from __future__ import annotations

import logging
from pathlib import Path
import cv2
import numpy as np

from app.ml.types import VisualSignals
from app.storage.media import resolve_local_path

logger = logging.getLogger(__name__)


class VisionExtractor:
    """Video processor analyzing upper-body movement, gaze orientation, head posture,
    and physical composure at 5 FPS on local CPU.
    """

    def __init__(self, sample_fps: float = 5.0):
        self.sample_fps = sample_fps
        self._face_cascade = None
        self._profile_cascade = None
        self._eye_cascade = None
        self._upperbody_cascade = None

    def _init_models(self):
        if self._face_cascade is None:
            data_dir = cv2.data.haarcascades
            self._face_cascade = cv2.CascadeClassifier(data_dir + "haarcascade_frontalface_default.xml")
            self._profile_cascade = cv2.CascadeClassifier(data_dir + "haarcascade_profileface.xml")
            self._eye_cascade = cv2.CascadeClassifier(data_dir + "haarcascade_eye.xml")
            self._upperbody_cascade = cv2.CascadeClassifier(data_dir + "haarcascade_upperbody.xml")

    def extract(self, video_path: str) -> tuple[VisualSignals | None, float]:
        local_path = resolve_local_path(video_path)
        path = Path(local_path) if local_path else Path(video_path)

        # Return None when video file is missing or unreadable (no hardcoded fake signals)
        if not path.exists() or path.stat().st_size < 1000:
            return None, 0.0

        try:
            self._init_models()
        except Exception as exc:
            logger.warning("Failed to initialize OpenCV cascades: %s", exc)
            return None, 0.0

        cap = cv2.VideoCapture(str(path))
        if not cap.isOpened():
            return None, 0.0

        native_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_interval = max(1, int(round(native_fps / self.sample_fps)))

        total_sampled = 0
        gaze_away_count = 0
        head_down_count = 0
        frozen_count = 0
        motion_deltas: list[float] = []

        prev_gray: np.ndarray | None = None
        frame_idx = 0

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_idx % frame_interval == 0:
                    total_sampled += 1
                    h_frame, w_frame = frame.shape[:2]
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

                    # 1. Body Movement & Physical Freeze Detection via Optical Frame Differencing
                    if prev_gray is not None and prev_gray.shape == gray.shape:
                        diff = cv2.absdiff(gray, prev_gray)
                        motion_delta = float(np.mean(diff) / 255.0)
                        motion_deltas.append(motion_delta)

                        # Immobility / freeze threshold: under 0.003 normalized change
                        if motion_delta < 0.003:
                            frozen_count += 1

                    prev_gray = gray

                    # 2. Upper-Body Posture Tracking
                    if self._upperbody_cascade is not None:
                        upperbodies = self._upperbody_cascade.detectMultiScale(
                            gray,
                            scaleFactor=1.15,
                            minNeighbors=3,
                            minSize=(int(w_frame * 0.20), int(h_frame * 0.20)),
                        )
                        # If upper body is significantly shifted off-frame
                        if len(upperbodies) > 0:
                            ux, uy, uw, uh = upperbodies[0]
                            body_center_x = (ux + uw / 2.0) / w_frame
                            if body_center_x < 0.20 or body_center_x > 0.80:
                                gaze_away_count += 1

                    # 3. Face, Gaze, and Head Orientation Tracking
                    faces = self._face_cascade.detectMultiScale(
                        gray,
                        scaleFactor=1.15,
                        minNeighbors=4,
                        minSize=(int(w_frame * 0.12), int(h_frame * 0.12)),
                    )

                    if len(faces) > 0:
                        # Take primary face
                        fx, fy, fw, fh = faces[0]
                        face_center_x = (fx + fw / 2.0) / w_frame
                        face_center_y = (fy + fh / 2.0) / h_frame

                        # Gaze divergence: face displaced horizontally from camera center
                        if face_center_x < 0.28 or face_center_x > 0.72:
                            gaze_away_count += 1
                        else:
                            # Search for eye gaze inside the upper half of the face
                            eye_roi = gray[fy : fy + int(fh * 0.55), fx : fx + fw]
                            eyes = self._eye_cascade.detectMultiScale(
                                eye_roi,
                                scaleFactor=1.1,
                                minNeighbors=3,
                                minSize=(int(fw * 0.15), int(fh * 0.10)),
                            )
                            # If candidate looks sharply down or eyes are closed/diverted
                            if len(eyes) == 0 and face_center_y > 0.40:
                                gaze_away_count += 1

                        # Head downward tilt: chin drops or face is positioned abnormally low in frame
                        if face_center_y > 0.58:
                            head_down_count += 1
                    else:
                        # Check if profile face (candidate turned head completely sideways)
                        profiles = self._profile_cascade.detectMultiScale(
                            gray,
                            scaleFactor=1.15,
                            minNeighbors=3,
                            minSize=(int(w_frame * 0.12), int(h_frame * 0.12)),
                        )
                        if len(profiles) > 0:
                            gaze_away_count += 1
                        else:
                            # Face not clearly detected (looking down away from screen)
                            head_down_count += 1
                            gaze_away_count += 1

                frame_idx += 1
        finally:
            cap.release()

        if total_sampled == 0:
            return None, 0.0

        # Calculate genuine normalized visual parameters
        gaze_away = round(min(1.0, gaze_away_count / total_sampled), 3)
        head_down = round(min(1.0, head_down_count / total_sampled), 3)
        freeze_ratio = round(min(1.0, frozen_count / max(1, len(motion_deltas))), 3) if motion_deltas else 0.0
        avg_motion = float(np.mean(motion_deltas)) if motion_deltas else 0.0
        gesture_energy = round(min(1.0, avg_motion * 35.0), 3)

        # Composite Visual Stress Score (0.0 to 100.0) based on real physical signals
        stress_score = round(
            100.0 * (
                0.35 * gaze_away
                + 0.25 * head_down
                + 0.25 * freeze_ratio
                + 0.15 * max(0.0, 0.5 - gesture_energy)
            ),
            1,
        )

        return VisualSignals(
            gaze_away=gaze_away,
            head_down=head_down,
            freeze_ratio=freeze_ratio,
            gesture_energy=gesture_energy,
        ), stress_score
