// ============================================================
// Naive Bayes Learning System - beginner-friendly JavaScript
// ============================================================

let rawData = null;
let processedData = null;
let model = null;
let split = null;
let selectedModelType = "gaussian";

const irisCSV = `sepal_length,sepal_width,petal_length,petal_width,species
5.1,3.5,1.4,0.2,setosa
4.9,3.0,1.4,0.2,setosa
4.7,3.2,1.3,0.2,setosa
4.6,3.1,1.5,0.2,setosa
5.0,3.6,1.4,0.2,setosa
7.0,3.2,4.7,1.4,versicolor
6.4,3.2,4.5,1.5,versicolor
6.9,3.1,4.9,1.5,versicolor
5.5,2.3,4.0,1.3,versicolor
6.5,2.8,4.6,1.5,versicolor
6.3,3.3,6.0,2.5,virginica
5.8,2.7,5.1,1.9,virginica
7.1,3.0,5.9,2.1,virginica
6.3,2.9,5.6,1.8,virginica
6.5,3.0,5.8,2.2,virginica`;

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    showPage(btn.dataset.target);
  });
});

function showPage(target) {
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.target === target));
  document.querySelectorAll('.page').forEach((p) => p.classList.toggle('active', p.id === target));
  const targetEl = document.getElementById(target);
  if (targetEl) targetEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function updateUploadStatus(message, percent, state = 'idle') {
  const status = document.getElementById('uploadStatus');
  const statusText = document.getElementById('uploadStatusText');
  const percentText = document.getElementById('uploadPercent');
  const progress = document.getElementById('uploadProgress');
  const track = document.querySelector('.upload-track');
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));

  status.classList.remove('is-working', 'is-complete', 'is-error');
  if (state !== 'idle') status.classList.add(`is-${state}`);
  statusText.textContent = message;
  percentText.textContent = `${safePercent}%`;
  progress.style.width = `${safePercent}%`;
  track.setAttribute('aria-valuenow', String(safePercent));
}

function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function variance(values) {
  const m = mean(values);
  return values.reduce((sum, value) => sum + (value - m) ** 2, 0) / values.length;
}
function gaussianPDF(x, mu, sigma2) {
  const safeVariance = sigma2 || 1e-9;
  return (1 / Math.sqrt(2 * Math.PI * safeVariance)) * Math.exp(-((x - mu) ** 2) / (2 * safeVariance));
}
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row = {};
    headers.forEach((header, index) => row[header] = values[index] || '');
    return row;
  });
  return { headers, rows };
}
function showPreview(data) {
  const table = document.getElementById('previewTable');
  table.innerHTML = '';
  const headerRow = document.createElement('tr');
  data.headers.forEach((h) => headerRow.innerHTML += `<th>${h}</th>`);
  table.appendChild(headerRow);
  data.rows.slice(0, 6).forEach((row) => {
    const tr = document.createElement('tr');
    data.headers.forEach((h) => tr.innerHTML += `<td>${row[h]}</td>`);
    table.appendChild(tr);
  });
  const info = document.getElementById('datasetInfo');
  info.classList.remove('hidden');
  info.innerHTML = `<strong>Dataset loaded</strong><br>${data.rows.length} rows x ${data.headers.length} columns<br><strong>Columns:</strong> ${data.headers.join(', ')}`;
  fillTargetDropdown(data.headers);
}
function fillTargetDropdown(headers) {
  const select = document.getElementById('targetSelect');
  select.innerHTML = headers.map((h) => `<option value="${h}">${h}</option>`).join('');
  select.value = headers[headers.length - 1];
}
function loadSampleDataset() {
  updateUploadStatus('Loading Iris sample dataset...', 35, 'working');
  rawData = parseCSV(irisCSV);
  showPreview(rawData);
  updateUploadStatus('Sample dataset ready for preprocessing', 100, 'complete');
  showPage('dataset');
}

document.getElementById('loadSampleBtn').addEventListener('click', loadSampleDataset);
document.getElementById('heroSampleBtn').addEventListener('click', loadSampleDataset);
document.getElementById('viewPipelineBtn').addEventListener('click', (event) => {
  event.preventDefault();
  showPage('train');
});
document.getElementById('csvInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  updateUploadStatus(`Reading ${file.name}...`, 0, 'working');
  reader.onprogress = (progressEvent) => {
    if (!progressEvent.lengthComputable) {
      updateUploadStatus(`Reading ${file.name}...`, 45, 'working');
      return;
    }
    updateUploadStatus(`Reading ${file.name}...`, (progressEvent.loaded / progressEvent.total) * 85, 'working');
  };
  reader.onerror = () => {
    updateUploadStatus('Upload failed. Please choose another CSV file.', 0, 'error');
  };
  reader.onload = () => {
    try {
      updateUploadStatus('Parsing CSV and preparing preview...', 92, 'working');
      rawData = parseCSV(reader.result);
      showPreview(rawData);
      updateUploadStatus(`${file.name} uploaded and ready`, 100, 'complete');
    } catch (error) {
      updateUploadStatus('Could not parse this CSV. Check the file format.', 0, 'error');
    }
  };
  reader.readAsText(file);
});

document.getElementById('preprocessBtn').addEventListener('click', () => {
  if (!rawData) return alert('Load a dataset first.');
  const target = document.getElementById('targetSelect').value;
  const strategy = document.getElementById('missingSelect').value;
  const numericFeatures = rawData.headers.filter((h) => h !== target && rawData.rows.some((r) => !Number.isNaN(parseFloat(r[h]))));
  const cleanedRows = rawData.rows.map((row) => {
    const copy = { ...row };
    numericFeatures.forEach((feature) => {
      if (copy[feature] === '' || Number.isNaN(parseFloat(copy[feature]))) {
        const values = rawData.rows.map((r) => parseFloat(r[feature])).filter((v) => !Number.isNaN(v));
        copy[feature] = strategy === 'mean' ? mean(values).toFixed(4) : values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
      }
    });
    return copy;
  });
  processedData = { headers: rawData.headers, rows: cleanedRows, features: numericFeatures, target };
  document.getElementById('preprocessOutput').classList.remove('hidden');
  document.getElementById('preprocessOutput').innerHTML = `<strong>Preprocessing complete.</strong><br>Target: ${target}<br>Numeric features: ${numericFeatures.join(', ')}`;
  showEDA();
  showPage('eda');
});

function showEDA() {
  if (!processedData) return;
  const output = document.getElementById('edaOutput');
  const classCounts = {};
  processedData.rows.forEach((row) => classCounts[row[processedData.target]] = (classCounts[row[processedData.target]] || 0) + 1);
  let html = '<div class="panel"><h3>Class Distribution</h3>';
  const maxCount = Math.max(...Object.values(classCounts));
  Object.entries(classCounts).forEach(([label, count]) => {
    html += `<p>${label}: ${count}</p><div class="bar"><span style="width:${(count / maxCount) * 100}%">${count}</span></div>`;
  });
  html += '</div><div class="panel"><h3>Feature Statistics</h3><table><tr><th>Feature</th><th>Mean</th><th>Variance</th></tr>';
  processedData.features.forEach((feature) => {
    const values = processedData.rows.map((r) => parseFloat(r[feature]));
    html += `<tr><td>${feature}</td><td>${mean(values).toFixed(3)}</td><td>${variance(values).toFixed(3)}</td></tr>`;
  });
  html += '</table></div>';
  output.innerHTML = html;
}

document.getElementById('splitSlider').addEventListener('input', (event) => { document.getElementById('splitText').textContent = event.target.value + '%'; });
document.getElementById('trainBtn').addEventListener('click', () => {
  if (!processedData) return alert('Preprocess the data first.');
  const trainPercent = Number(document.getElementById('splitSlider').value) / 100;
  const shuffled = [...processedData.rows].sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * trainPercent);
  split = { train: shuffled.slice(0, splitIndex), test: shuffled.slice(splitIndex) };
  selectedModelType = document.getElementById('modelTypeSelect').value;
  model = selectedModelType === 'gaussian'
    ? trainGaussianNB(split.train, processedData.features, processedData.target)
    : trainMultinomialNB(split.train, processedData.features, processedData.target);
  showModel(); buildPredictionForm(); evaluateModel(); showPage('predict');
});
function trainGaussianNB(rows, features, target) {
  const classes = [...new Set(rows.map((r) => r[target]))];
  const priors = {}; const params = {};
  classes.forEach((className) => {
    const classRows = rows.filter((r) => r[target] === className);
    priors[className] = classRows.length / rows.length;
    params[className] = {};
    features.forEach((feature) => {
      const values = classRows.map((r) => parseFloat(r[feature]));
      params[className][feature] = { mu: mean(values), sigma2: variance(values) || 1e-9 };
    });
  });
  return { type: 'gaussian', classes, priors, params };
}

function trainMultinomialNB(rows, features, target) {
  const classes = [...new Set(rows.map((r) => r[target]))];
  const priors = {};
  const featureProb = {};
  classes.forEach((className) => {
    const classRows = rows.filter((r) => r[target] === className);
    priors[className] = classRows.length / rows.length;
    featureProb[className] = {};
    const totals = features.map((feature) =>
      classRows.reduce((sum, row) => sum + Math.max(0, parseFloat(row[feature]) || 0), 0)
    );
    const totalCount = totals.reduce((sum, value) => sum + value, 0);
    features.forEach((feature, index) => {
      // Laplace smoothing: add 1 so no probability becomes zero.
      featureProb[className][feature] = (totals[index] + 1) / (totalCount + features.length);
    });
  });
  return { type: 'multinomial', classes, priors, featureProb };
}
function showModel() {
  const output = document.getElementById('trainOutput');
  output.classList.remove('hidden');
  let html = `<h3 class="good">${model.type} model trained successfully</h3><p>Training samples: ${split.train.length}, Testing samples: ${split.test.length}</p>`;
  html += '<table><tr><th>Class</th><th>Prior</th><th>Learned parameters</th></tr>';
  model.classes.forEach((className) => {
    let parameterText = '';
    if (model.type === 'gaussian') {
      parameterText = processedData.features.map((f) => `${f}: mu=${model.params[className][f].mu.toFixed(2)}, variance=${model.params[className][f].sigma2.toFixed(2)}`).join('<br>');
    } else {
      parameterText = processedData.features.map((f) => `${f}: P(feature|class)=${model.featureProb[className][f].toFixed(4)}`).join('<br>');
    }
    html += `<tr><td>${className}</td><td>${model.priors[className].toFixed(3)}</td><td>${parameterText}</td></tr>`;
  });
  html += '</table>'; output.innerHTML = html;
  document.getElementById('learnOutput').classList.remove('hidden');
  document.getElementById('learnOutput').innerHTML = '<h3>What did training learn?</h3><p>For every class and feature, the model learned a mean and variance. These values define the bell curve used during prediction.</p>';
}
function buildPredictionForm() {
  const form = document.getElementById('predictionForm');
  let html = '<h3>Enter a new sample</h3><div class="form-grid">';
  processedData.features.forEach((feature) => {
    const placeholder = model.type === 'gaussian' ? model.params[model.classes[0]][feature].mu.toFixed(2) : '1';
    html += `<label>${feature}<input type="number" step="any" id="input_${feature}" placeholder="Example: ${placeholder}"></label>`;
  });
  html += '</div><button onclick="predictFromForm()">Predict</button>'; form.innerHTML = html;
}
function predictGaussianNB(sample) {
  const scores = {}; const steps = {};
  model.classes.forEach((className) => {
    let logScore = Math.log(model.priors[className]);
    steps[className] = [`Start with log prior = ${logScore.toFixed(4)}`];
    processedData.features.forEach((feature) => {
      const x = parseFloat(sample[feature]);
      if (model.type === 'gaussian') {
        const { mu, sigma2 } = model.params[className][feature];
        const likelihood = gaussianPDF(x, mu, sigma2);
        logScore += Math.log(likelihood || 1e-12);
        steps[className].push(`${feature}: x=${x}, mu=${mu.toFixed(3)}, variance=${sigma2.toFixed(3)}, likelihood=${likelihood.toFixed(6)}`);
      } else {
        const count = Math.max(0, x || 0);
        const probability = model.featureProb[className][feature];
        logScore += count * Math.log(probability || 1e-12);
        steps[className].push(`${feature}: count=${count}, probability=${probability.toFixed(6)}, contribution=count x log(probability)`);
      }
    });
    scores[className] = logScore;
  });
  const predicted = Object.keys(scores).reduce((best, className) => scores[className] > scores[best] ? className : best);
  return { predicted, scores, steps };
}
function predictFromForm() {
  if (!model) return alert('Train the model first.');
  const sample = {}; processedData.features.forEach((feature) => sample[feature] = document.getElementById(`input_${feature}`).value);
  const result = predictGaussianNB(sample); const output = document.getElementById('predictionOutput'); output.classList.remove('hidden');
  let html = `<h3>Final Prediction: <span class="good">${result.predicted}</span></h3>`;
  model.classes.forEach((className) => { html += `<h4>${className} score = ${result.scores[className].toFixed(4)}</h4><ul>`; result.steps[className].forEach((step) => html += `<li>${step}</li>`); html += '</ul>'; });
  output.innerHTML = html;
}
window.predictFromForm = predictFromForm;
function evaluateModel() {
  if (!model || !split) return;
  const classes = model.classes;
  const matrix = {};
  classes.forEach((a) => { matrix[a] = {}; classes.forEach((p) => matrix[a][p] = 0); });
  let correct = 0;
  split.test.forEach((row) => {
    const actual = row[processedData.target];
    const predicted = predictGaussianNB(row).predicted;
    matrix[actual][predicted] += 1;
    if (actual === predicted) correct++;
  });
  const accuracy = split.test.length ? correct / split.test.length : 0;
  let html = `<h3>Accuracy</h3><p class="formula">${correct} correct / ${split.test.length} test samples = ${(accuracy * 100).toFixed(1)}%</p>`;
  html += '<h3>Precision, Recall, F1-score</h3><table><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1-score</th></tr>';
  classes.forEach((cls) => {
    const tp = matrix[cls][cls];
    const fp = classes.reduce((sum, actual) => actual === cls ? sum : sum + matrix[actual][cls], 0);
    const fn = classes.reduce((sum, predicted) => predicted === cls ? sum : sum + matrix[cls][predicted], 0);
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
    html += `<tr><td>${cls}</td><td>${precision.toFixed(2)}</td><td>${recall.toFixed(2)}</td><td>${f1.toFixed(2)}</td></tr>`;
  });
  html += '</table><h3>Confusion Matrix</h3><table><tr><th>Actual \ Predicted</th>';
  classes.forEach((cls) => html += `<th>${cls}</th>`);
  html += '</tr>';
  classes.forEach((actual) => {
    html += `<tr><th>${actual}</th>`;
    classes.forEach((predicted) => html += `<td>${matrix[actual][predicted]}</td>`);
    html += '</tr>';
  });
  html += '</table>';
  html += `<h3>K-fold Cross-validation</h3><p class="formula">K = ${document.getElementById('kFoldInput').value}. Full Python/scikit-learn cross-validation is included in colab_naive_bayes_training.py.</p>`;
  document.getElementById('evaluationOutput').innerHTML = html;
}
