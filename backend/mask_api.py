from flask import Flask, json, jsonify, request, send_file
import numpy as np # forlinear algebra
import os
import io
os.environ["CUDA_VISIBLE_DEVICES"]="-1"
from PIL import Image
import cv2
from keras.models import Sequential, load_model
from keras.layers import Conv2D
from keras.layers import MaxPooling2D
from keras.layers import Flatten
from keras.layers import Dense
from keras.preprocessing.image import img_to_array
import base64
import sys

#Loading Model
# the CNN model

cnn = Sequential()
#add() to add layers to cnn.
#Convolution
cnn.add(Conv2D(32, (3, 3), activation="relu", input_shape=(64, 64, 3)))

#Pooling
cnn.add(MaxPooling2D(pool_size = (2, 2)))

# 2nd Convolution
cnn.add(Conv2D(32, (3, 3), activation="relu"))

# 2nd Pooling layer
cnn.add(MaxPooling2D(pool_size = (2, 2)))
#Flatten serves as a connection between the convolution and dense layers.
# Flatten the layer
cnn.add(Flatten())

# Fully Connected Layers
cnn.add(Dense(activation = 'relu', units = 128))
cnn.add(Dense(activation = 'sigmoid', units = 1))
cnn.load_weights("model_weights.h5")
print("Model Loaded")

caffeModel = "./res10_300x300_ssd_iter_140000.caffemodel"
prototextPath = "./deploy.prototxt.txt"
net = cv2.dnn.readNetFromCaffe(prototextPath,caffeModel)

#procesess the import image with opencv
test_image = "./image.jpg"

def return_masked_image(pil_image):
    image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    (h, w) = image.shape[:2]
    # blobImage convert RGB (104.0, 177.0, 123.0)
    blob = cv2.dnn.blobFromImage(image, 1.0, (300, 300), (104.0, 177.0, 123.0))

    print("[INFO] computing face detections...")
    net.setInput(blob)
    detections = net.forward()
    #print(detections.shape[2])
    # loop over the detections
    n_people = 0
    n_mask = 0
    n_w_mask = 0
    for i in range(0, detections.shape[2]):
        # extract the confidence (i.e., probability) associated with
        # the detection
        confidence = detections[0, 0, i, 2]
        # filter out weak detections by ensuring the confidence is
        # greater than the minimum confidence
        if confidence > 0.3:
            # compute the (x, y)-coordinates of the bounding box for
            # the object
            box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
            (startX, startY, endX, endY) = box.astype("int")
            # ensure the bounding boxes fall within the dimensions of
            # the frame
            (startX, startY) = (max(0, startX), max(0, startY))
            (endX, endY) = (min(w - 1, endX), min(h - 1, endY))
            face = image[startY:endY, startX:endX]
            face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
            face = cv2.resize(face, (64, 64))
            face = img_to_array(face)
            face = np.expand_dims(face, axis=0)
            classes = int(cnn.predict_classes(face)[0])
            # print(classes)
            if classes == 0:
                n_mask += 1
            else:
                n_w_mask += 1
            label = "Mask" if classes == 0 else "No Mask"
            # print(label)
            color = (0, 255, 0) if label == "Mask" else (0, 0, 255)
            # include the probability in the label
            label = "{}: {:.2f}%".format(label, confidence * 100)
            # display the label and bounding box rectangle on the output
            # frame
            cv2.putText(image, label, (startX, startY - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 2)
            cv2.rectangle(image, (startX, startY), (endX, endY), color, 2)
            n_people += 1
    return image, n_people, n_mask, n_w_mask


#print(return_masked_image(test_image))
api = Flask(__name__)

@api.route('/mask_detector', methods=['POST'])
def mask_detector():
    if request.method == 'POST':
        if request.files.get("image"):
        # read the image in PIL format
            out_file_name = "mask_detected_"+request.files['image'].filename
            #out_path = "./output_images/"+out_file_name
            out_path = os.path.abspath("./output_images/"+out_file_name)
            #image = request.files["image"].read()
            pil_image = Image.open(request.files["image"])
            out_image, n_people, n_mask, n_w_mask = return_masked_image(pil_image)
            #path =

            cv2.imwrite(out_path, out_image)
            #out_path = out_path[1:]
            #print(type(out_image))
            output = {"image_path":out_path,"no_people": n_people, "no_people_with_mask":n_mask,
                      "no_people_without_mask": n_w_mask}
            #print(n_people, n_mask, n_w_mask)
            return jsonify(output)

@api.route('/get_image', methods=['POST'])
def get_image():
            req_data = request.form.get('path')
            print(req_data)
            out_file_name = req_data
            print(req_data)
            filename = out_file_name
            #'image.jpg'
            return send_file(filename, mimetype='image/jpg')

if __name__ == '__main__':
    api.run(host="0.0.0.0", port=8080, debug=True)
