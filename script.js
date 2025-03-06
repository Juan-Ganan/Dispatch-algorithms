// Constantes para la escala y altura de fila
const timeScale = 40; // 1 unidad de tiempo = 40 píxeles
const rowHeight = 60; // Altura para cada proceso (fila)

// Simulación FIFO
function simulateFIFO(processes) {
  let currentTime = 0;
  processes.sort((a, b) => a.arrival - b.arrival);
  processes.forEach(proc => {
    proc.start = Math.max(currentTime, proc.arrival);
    proc.finish = proc.start + proc.burst;
    proc.waiting = proc.start - proc.arrival;
    proc.turnaround = proc.finish - proc.arrival;
    currentTime = proc.finish;
  });
  return processes;
}

// Simulación SJF (no premptivo)
function simulateSJF(processes) {
  let currentTime = 0;
  let scheduled = [];
  let unscheduled = processes.slice();
  while (unscheduled.length > 0) {
    let available = unscheduled.filter(p => p.arrival <= currentTime);
    if (available.length === 0) {
      currentTime = Math.min(...unscheduled.map(p => p.arrival));
      available = unscheduled.filter(p => p.arrival <= currentTime);
    }
    let selected = available.reduce((prev, curr) => (curr.burst < prev.burst ? curr : prev));
    selected.start = Math.max(currentTime, selected.arrival);
    selected.finish = selected.start + selected.burst;
    selected.waiting = selected.start - selected.arrival;
    selected.turnaround = selected.finish - selected.arrival;
    currentTime = selected.finish;
    scheduled.push(selected);
    unscheduled = unscheduled.filter(p => p !== selected);
  }
  return scheduled;
}

// Simulación Prioridad (no premptivo)
function simulatePriority(processes) {
  let currentTime = 0;
  let scheduled = [];
  let unscheduled = processes.slice();
  while (unscheduled.length > 0) {
    let available = unscheduled.filter(p => p.arrival <= currentTime);
    if (available.length === 0) {
      currentTime = Math.min(...unscheduled.map(p => p.arrival));
      available = unscheduled.filter(p => p.arrival <= currentTime);
    }
    let selected = available.reduce((prev, curr) => (curr.priority < prev.priority ? curr : prev));
    selected.start = Math.max(currentTime, selected.arrival);
    selected.finish = selected.start + selected.burst;
    selected.waiting = selected.start - selected.arrival;
    selected.turnaround = selected.finish - selected.arrival;
    currentTime = selected.finish;
    scheduled.push(selected);
    unscheduled = unscheduled.filter(p => p !== selected);
  }
  return scheduled;
}

// Simulación SRTF (preemptivo)
function simulateSRTF(processes) {
  const n = processes.length;
  let remaining = processes.map(p => p.burst);
  let completed = 0;
  let currentTime = 0;
  let startRecorded = new Set();
  while (completed < n) {
    let available = processes.filter((p, i) => p.arrival <= currentTime && remaining[i] > 0);
    if (available.length === 0) {
      currentTime++;
      continue;
    }
    let index = -1;
    let minRemaining = Infinity;
    for (let i = 0; i < processes.length; i++) {
      if (processes[i].arrival <= currentTime && remaining[i] > 0 && remaining[i] < minRemaining) {
        minRemaining = remaining[i];
        index = i;
      }
    }
    let proc = processes[index];
    if (!startRecorded.has(index)) {
      proc.start = currentTime;
      startRecorded.add(index);
    }
    remaining[index]--;
    currentTime++;
    if (remaining[index] === 0) {
      proc.finish = currentTime;
      proc.waiting = proc.finish - proc.arrival - proc.burst;
      proc.turnaround = proc.finish - proc.arrival;
      completed++;
    }
  }
  return processes;
}

// Simulación Round Robin con slices para el Gantt
function simulateRR(processes, quantum = 2) {
  let queue = [];
  let currentTime = 0;
  let processesCopy = processes.map(p => ({ ...p, remaining: p.burst, started: false, start: null, finish: null }));
  processesCopy.sort((a, b) => a.arrival - b.arrival);
  let slices = [];
  let i = 0;
  if (i < processesCopy.length && processesCopy[i].arrival > currentTime) {
    currentTime = processesCopy[i].arrival;
  }
  while (i < processesCopy.length && processesCopy[i].arrival <= currentTime) {
    queue.push(processesCopy[i]);
    i++;
  }
  while (queue.length > 0) {
    let proc = queue.shift();
    if (!proc.started) {
      proc.start = currentTime;
      proc.started = true;
    }
    let execTime = Math.min(quantum, proc.remaining);
    slices.push({
      name: proc.name,
      start: currentTime,
      duration: execTime,
      row: parseInt(proc.name.substring(1)) - 1
    });
    currentTime += execTime;
    proc.remaining -= execTime;
    while (i < processesCopy.length && processesCopy[i].arrival <= currentTime) {
      queue.push(processesCopy[i]);
      i++;
    }
    if (proc.remaining > 0) {
      queue.push(proc);
    } else {
      proc.finish = currentTime;
      proc.waiting = proc.finish - proc.arrival - proc.burst;
      proc.turnaround = proc.finish - proc.arrival;
    }
    if (queue.length === 0 && i < processesCopy.length) {
      currentTime = processesCopy[i].arrival;
      queue.push(processesCopy[i]);
      i++;
    }
  }
  processesCopy.forEach(p => {
    delete p.remaining;
    delete p.started;
  });
  return { processes: processesCopy, slices: slices };
}

// Función para clonar procesos
function cloneProcesses(processes) {
  return processes.map(p => ({ ...p }));
}

// Función para llenar la tabla con datos de procesos
function fillTable(processes, tableBody) {
  tableBody.innerHTML = "";
  processes.forEach(proc => {
    let row = document.createElement("tr");
    row.innerHTML = `
      <td>${proc.name}</td>
      <td>${proc.arrival}</td>
      <td>${proc.burst}</td>
      <td>${proc.priority}</td>
      <td>${proc.start}</td>
      <td>${proc.finish}</td>
      <td>${proc.waiting}</td>
      <td>${proc.turnaround}</td>
    `;
    tableBody.appendChild(row);
  });
}

// Función para calcular promedios
function calculateAverages(processes) {
  let totalWaiting = processes.reduce((sum, p) => sum + p.waiting, 0);
  let totalTurnaround = processes.reduce((sum, p) => sum + p.turnaround, 0);
  return {
    avgWaiting: (totalWaiting / processes.length).toFixed(2),
    avgTurnaround: (totalTurnaround / processes.length).toFixed(2)
  };
}

// Dibujar diagrama de Gantt (bloque único)
function drawGanttChart(processes, chartContainer, axisContainer) {
  chartContainer.innerHTML = "";
  axisContainer.innerHTML = "";
  let totalTime = Math.max(...processes.map(p => p.finish));
  chartContainer.style.width = (totalTime * timeScale) + "px";
  axisContainer.style.width = (totalTime * timeScale) + "px";
  let maxRow = Math.max(...processes.map(p => parseInt(p.name.substring(1))));
  chartContainer.style.height = (maxRow * rowHeight) + "px";
  processes.forEach(proc => {
    let rowIndex = parseInt(proc.name.substring(1)) - 1;
    let block = document.createElement("div");
    block.className = "processBlock";
    block.style.left = (proc.start * timeScale) + "px";
    block.style.width = (proc.burst * timeScale) + "px";
    block.style.top = (rowIndex * rowHeight + 10) + "px";
    block.style.height = (rowHeight - 20) + "px";
    block.textContent = proc.name;
    chartContainer.appendChild(block);
  });
  for (let t = 0; t <= totalTime; t++) {
    let marker = document.createElement("div");
    marker.className = "timeMarker";
    marker.style.left = (t * timeScale) + "px";
    axisContainer.appendChild(marker);
    let label = document.createElement("div");
    label.className = "timeLabel";
    label.style.left = (t * timeScale) + "px";
    label.textContent = t;
    axisContainer.appendChild(label);
  }
}

// Dibujar diagrama de Gantt para Round Robin (slices)
function drawGanttChartRR(slices, chartContainer, axisContainer) {
  chartContainer.innerHTML = "";
  axisContainer.innerHTML = "";
  let totalTime = 0;
  slices.forEach(slice => {
    totalTime = Math.max(totalTime, slice.start + slice.duration);
  });
  chartContainer.style.width = (totalTime * timeScale) + "px";
  axisContainer.style.width = (totalTime * timeScale) + "px";
  let maxRow = Math.max(...slices.map(s => s.row)) + 1;
  chartContainer.style.height = (maxRow * rowHeight) + "px";
  slices.forEach(slice => {
    let block = document.createElement("div");
    block.className = "processBlock";
    block.style.left = (slice.start * timeScale) + "px";
    block.style.width = (slice.duration * timeScale) + "px";
    block.style.top = (slice.row * rowHeight + 10) + "px";
    block.style.height = (rowHeight - 20) + "px";
    block.textContent = slice.name;
    chartContainer.appendChild(block);
  });
  for (let t = 0; t <= totalTime; t++) {
    let marker = document.createElement("div");
    marker.className = "timeMarker";
    marker.style.left = (t * timeScale) + "px";
    axisContainer.appendChild(marker);
    let label = document.createElement("div");
    label.className = "timeLabel";
    label.style.left = (t * timeScale) + "px";
    label.textContent = t;
    axisContainer.appendChild(label);
  }
}

// Dibujar eje Y
function drawYAxis(processes, yAxisContainer) {
  yAxisContainer.innerHTML = "";
  let maxRow = Math.max(...processes.map(p => parseInt(p.name.substring(1))));
  yAxisContainer.style.height = (maxRow * rowHeight) + "px";
  for (let i = 1; i <= maxRow; i++) {
    let label = document.createElement("div");
    label.className = "yAxisLabel";
    label.textContent = "P" + i;
    yAxisContainer.appendChild(label);
  }
}

// Función para obtener los procesos ingresados por el usuario
function getInputProcesses() {
  let rows = document.querySelectorAll("#inputTable tbody tr");
  let processes = [];
  rows.forEach((row, index) => {
    let cells = row.querySelectorAll("input");
    let arrival = parseInt(cells[0].value);
    let burst = parseInt(cells[1].value);
    let priority = parseInt(cells[2].value);
    processes.push({ name: "P" + (index + 1), arrival, burst, priority });
  });
  return processes;
}

// Referencias a elementos de la página
const tableBodyFIFO = document.querySelector("#tableFIFO tbody");
const ganttFIFO = document.getElementById("ganttFIFO");
const axisFIFO = document.getElementById("axisFIFO");
const yAxisFIFO = document.getElementById("yAxisFIFO");
const averagesFIFO = document.getElementById("averagesFIFO");

const tableBodySJF = document.querySelector("#tableSJF tbody");
const ganttSJF = document.getElementById("ganttSJF");
const axisSJF = document.getElementById("axisSJF");
const yAxisSJF = document.getElementById("yAxisSJF");
const averagesSJF = document.getElementById("averagesSJF");

const tableBodyPriority = document.querySelector("#tablePriority tbody");
const ganttPriority = document.getElementById("ganttPriority");
const axisPriority = document.getElementById("axisPriority");
const yAxisPriority = document.getElementById("yAxisPriority");
const averagesPriority = document.getElementById("averagesPriority");

const tableBodySRTF = document.querySelector("#tableSRTF tbody");
const ganttSRTF = document.getElementById("ganttSRTF");
const axisSRTF = document.getElementById("axisSRTF");
const yAxisSRTF = document.getElementById("yAxisSRTF");
const averagesSRTF = document.getElementById("averagesSRTF");

const tableBodyRR = document.querySelector("#tableRR tbody");
const ganttRR = document.getElementById("ganttRR");
const axisRR = document.getElementById("axisRR");
const yAxisRR = document.getElementById("yAxisRR");
const averagesRR = document.getElementById("averagesRR");

// Función para simular y dibujar resultados con una fuente de procesos dada
function calcularSimulaciones(baseProcesses) {
  // FIFO
  let processesFIFO = cloneProcesses(baseProcesses);
  let scheduledFIFO = simulateFIFO(processesFIFO);
  fillTable(scheduledFIFO, tableBodyFIFO);
  let avgFIFO = calculateAverages(scheduledFIFO);
  averagesFIFO.innerHTML = `Tiempo de espera promedio: ${avgFIFO.avgWaiting} | Tiempo de sistema promedio: ${avgFIFO.avgTurnaround}`;
  drawGanttChart(scheduledFIFO, ganttFIFO, axisFIFO);
  drawYAxis(scheduledFIFO, yAxisFIFO);
  
  // SJF
  let processesSJF = cloneProcesses(baseProcesses);
  let scheduledSJF = simulateSJF(processesSJF);
  fillTable(scheduledSJF, tableBodySJF);
  let avgSJF = calculateAverages(scheduledSJF);
  averagesSJF.innerHTML = `Tiempo de espera promedio: ${avgSJF.avgWaiting} | Tiempo de sistema promedio: ${avgSJF.avgTurnaround}`;
  drawGanttChart(scheduledSJF, ganttSJF, axisSJF);
  drawYAxis(scheduledSJF, yAxisSJF);
  
  // Prioridad
  let processesPriority = cloneProcesses(baseProcesses);
  let scheduledPriority = simulatePriority(processesPriority);
  fillTable(scheduledPriority, tableBodyPriority);
  let avgPriority = calculateAverages(scheduledPriority);
  averagesPriority.innerHTML = `Tiempo de espera promedio: ${avgPriority.avgWaiting} | Tiempo de sistema promedio: ${avgPriority.avgTurnaround}`;
  drawGanttChart(scheduledPriority, ganttPriority, axisPriority);
  drawYAxis(scheduledPriority, yAxisPriority);
  
  // SRTF
  let processesSRTF = cloneProcesses(baseProcesses);
  let scheduledSRTF = simulateSRTF(processesSRTF);
  fillTable(scheduledSRTF, tableBodySRTF);
  let avgSRTF = calculateAverages(scheduledSRTF);
  averagesSRTF.innerHTML = `Tiempo de espera promedio: ${avgSRTF.avgWaiting} | Tiempo de sistema promedio: ${avgSRTF.avgTurnaround}`;
  drawGanttChart(scheduledSRTF, ganttSRTF, axisSRTF);
  drawYAxis(scheduledSRTF, yAxisSRTF);
  
  // Round Robin
  let quantum = 2;
  let rrResult = simulateRR(cloneProcesses(baseProcesses), quantum);
  fillTable(rrResult.processes, tableBodyRR);
  let avgRR = calculateAverages(rrResult.processes);
  averagesRR.innerHTML = `Tiempo de espera promedio: ${avgRR.avgWaiting} | Tiempo de sistema promedio: ${avgRR.avgTurnaround} (Quantum = ${quantum})`;
  drawGanttChartRR(rrResult.slices, ganttRR, axisRR);
  drawYAxis(rrResult.processes, yAxisRR);
}

// Botón para calcular con procesos aleatorios
document.getElementById("randomButton").addEventListener("click", () => {
  let baseProcesses = generateProcesses();
  calcularSimulaciones(baseProcesses);
});

// Botón para calcular con datos ingresados
document.getElementById("ingresarDatosButton").addEventListener("click", () => {
  let baseProcesses = getInputProcesses();
  calcularSimulaciones(baseProcesses);
});

// Función para generar procesos aleatorios
function generateProcesses() {
  const numProcesses = 5;
  let processes = [];
  let arrivalSet = new Set();
  for (let i = 0; i < numProcesses; i++) {
    let arrival;
    do {
      arrival = Math.floor(Math.random() * 11); // valores de 0 a 10
    } while (arrivalSet.has(arrival));
    arrivalSet.add(arrival);
    let burst = Math.floor(Math.random() * 5) + 1;
    let priority = Math.floor(Math.random() * 3) + 1;
    processes.push({ name: "P" + (i + 1), arrival, burst, priority });
  }
  return processes;
}
