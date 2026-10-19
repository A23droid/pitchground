from __future__ import annotations

import logging
from pathlib import Path
import cv2
import numpy as np

from app.ml.types import VisualSignals
from app.storage.media import resolve_local_path

logger = logging.getLogger(__name__)


class VisionExtractor:
    """Offline video processor analyzing non-verbal delivery quality, gaze, and physical stress at 5 FPS."""

    def __init__(self, sample_fps: float = 5.0):
        self.sample_fps = sample_fps
        self._mp_face_mesh = None
        self._mp_pose = None

    def _init_models(self):
        if self._mp_face_mesh is None:
            import mediapipe as mp
            self._mp_face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            self._mp_pose = mp.solutions.pose.Pose(
                static_image_mode=False,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )

    def extract(self, video_path: str) -> tuple[VisualSignals, float]:
        local_path = resolve_local_path(video_path)
        path = Path(local_path) if local_path else Path(video_path)

        fallback = VisualSignals(gaze_away=0.10, head_down=0.10, freeze_ratio=0.05, gesture_energy=0.45)
        if not path.exists() or path.stat().st_size < 1000:
            return fallback, 22.0

        try:
            self._init_models()
        except Exception as exc:
            logger.warning("Failed to initialize MediaPipe models: %s", exc)
            return fallback, 22.0

        cap = cv2.VideoCapture(str(path))
        if not cap.isOpened():
            return fallback, 22.0

        native_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frame_interval = max(1, int(round(native_fps / self.sample_fps)))

        total_sampled = 0
        gaze_away_count = 0
        head_down_count = 0
        frozen_count = 0
        motion_deltas: list[float] = []

        prev_pose_landmarks = None
        frame_idx = 0

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_idx % frame_interval == 0:
                    total_sampled += 1
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                    # 1. Face Mesh: Iris Gaze & Head Tilt
                    try:
                        face_results = self._mp_face_mesh.process(rgb)
                        if face_results.multi_face_landmarks:
                            lms = face_results.multi_face_landmarks[0].landmark
                            # Iris center (468) vs inner eye corner (133) and outer eye corner (33)
                            iris_x = lms[468].x
                            inner_x = lms[133].x
                            outer_x = lms[33].x
                            eye_width = abs(outer_x - inner_x) or 1e-4
                            ratio = (iris_x - min(inner_x, outer_x)) / eye_width

                            # Gaze diverted if pupil offset is outside the center band
                            if ratio < 0.30 or ratio > 0.70:
                                gaze_away_count += 1

                            # Chin (152) vs Nose (1) vertical distance check for head downward tilt
                            if (lms[152].y - lms[1].y) < 0.12:
                                head_down_count += 1
                    except Exception:
                        pass

                    # 2. Pose: Body Motion & Physical Freeze Detection
                    try:
                        pose_results = self._mp_pose.process(rgb)
                        if pose_results.pose_landmarks:
                            # Upper body joints: shoulders, elbows, wrists, nose
                            cur_landmarks = np.array(
                                [[lm.x, lm.y] for lm in pose_results.pose_landmarks.landmark[:17]]
                            )
                            if prev_pose_landmarks is not None:
                                delta = float(np.mean(np.linalg.norm(cur_landmarks - prev_pose_landmarks, axis=1)))
                                motion_deltas.append(delta)
                                if delta < 0.003:  # Immobility / freeze threshold
                                    frozen_count += 1
                            prev_pose_landmarks = cur_landmarks
                    except Exception:
                        pass

                frame_idx += 1
        finally:
            cap.release()

        if total_sampled == 0:
            return fallback, 22.0

        gaze_away = round(gaze_away_count / total_sampled, 3)
        head_down = round(head_down_count / total_sampled, 3)
        freeze_ratio = round(frozen_count / max(1, len(motion_deltas)), 3) if motion_deltas else 0.05
        avg_motion = float(np.mean(motion_deltas)) if motion_deltas else 0.02
        gesture_energy = round(min(1.0, avg_motion * 35.0), 3)

        # Composite Visual Stress Score (0 to 100)
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
