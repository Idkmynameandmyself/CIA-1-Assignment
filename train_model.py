import numpy as np
import json
from sklearn.datasets import load_iris
from sklearn.naive_bayes import GaussianNB

# Load data
iris = load_iris()
X, y = iris.data, iris.target

# Train
gnb = GaussianNB()
gnb.fit(X, y)

# Create the "Brain" JSON
model_data = {
    "class_names": iris.target_names.tolist(),
    "priors": gnb.class_prior_.tolist(),
    "means": gnb.theta_.tolist(),
    "variances": gnb.var_.tolist(),
    "features": iris.feature_names
}

with open('model.json', 'w') as f:
    json.dump(model_data, f, indent=4)

print("model.json created. Your website can now use this for instant predictions!")