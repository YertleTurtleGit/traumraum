import cv2
import numpy as np
import mediapipe as mp
from freenect import sync_get_depth as get_depth, sync_get_video as get_video
import freenect


mp_drawing = mp.solutions.drawing_utils
mp_hands = mp.solutions.hands

# For webcam input:
hands = mp_hands.Hands(
    min_detection_confidence=0.3, min_tracking_confidence=0.5)


def pretty_depth(depth):
    np.clip(depth, 0, 2**10-1, depth)
    depth >>= 2
    depth = depth.astype(np.uint8)
    return depth


global depth, rgb
cv2.namedWindow("window", cv2.WND_PROP_FULLSCREEN)
cv2.setWindowProperty("window", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

D_WIDTH = 640
D_HEIGHT = 480

while True:
    depth, _ = get_depth()
    rgb, _ = get_video()

    #ir, _ = get_video(0, freenect.VIDEO_IR_10BIT)
    #ir *= 3
    #np.clip(ir, 0, 2**10-1, ir)
    #ir >>= 2

    #ir = np.dstack((ir, ir, ir)).astype(np.uint8)

    depth_image = np.dstack((depth, depth, depth)).astype(np.uint8)
    depth_image.fill(255)

    results = hands.process(rgb)

    # Draw the hand annotations on the image.
    rgb.flags.writeable = True
    # depth = cv2.cvtColor(depth, cv2.COLOR_RGB2BGR)
    #ir *= 0
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            xTip = round(hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP].x * D_WIDTH)
            yTip = round(hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP].y * D_HEIGHT)

            depthAtTip = depth[yTip][xTip]

            if(depthAtTip > 630 and depthAtTip < 670):
                mp_drawing.draw_landmarks(
                    depth_image, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            else:
                depth_image *= 0

    depth_image = np.array(depth_image)

    # The number of pixels
    num_rows, num_cols = depth_image.shape[:2]

    # Creating a translation matrix
    translation_matrix = np.float32([[1, 0, 20], [0, 1, 110]])

    # Image translation
    depth_image = cv2.warpAffine(depth_image, translation_matrix, (num_cols, num_rows))

    cv2.imshow('window', depth_image)

    if cv2.waitKey(5) & 0xFF == 27:
        break

hands.close()


def doloop():
    global depth, rgb
    while True:
        # Get a fresh frame

        # Build a two panel color image
        d3 = np.dstack((depth, depth, depth)).astype(np.uint8)
        da = np.hstack((d3, rgb))

        # Simple Downsample
        cv.imshow('both', np.array(da[::2, ::2, ::-1]))
        cv.waitKey(5)


# doloop()
