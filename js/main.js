"use strict";
(function () {
    const storageKey = "kanban-tasks";
    let tasks = [];
    let editingTaskId = null;
    const addTaskBtn = document.getElementById("add-task-btn");
    const modalOverlay = document.getElementById("modal-overlay");
    const modalTitle = document.getElementById("modal-title");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    const taskForm = document.getElementById("task-form");
    const submitBtnText = document.getElementById("submit-btn-text");
    const taskTitleInput = document.getElementById("task-title");
    const titleError = document.getElementById("title-error");
    const taskPriorityInput = document.getElementById("task-priority");
    const taskDueDateInput = document.getElementById("task-due-date");
    const dateError = document.getElementById("date-error");
    const taskDescInput = document.getElementById("task-description");
    const charCount = document.getElementById("char-count");
    const columnsContainer = document.getElementById("columns-container");
    if (localStorage.getItem(storageKey)) {
        tasks = JSON.parse(localStorage.getItem(storageKey));
        migrateLegacyTaskIds();
    }
    displayTasks();
    function migrateLegacyTaskIds() {
        let needsSave = false;
        for (let i = 0; i < tasks.length; i++) {
            const legacy = tasks[i];
            if (!tasks[i].taskId && legacy.id) {
                tasks[i].taskId = legacy.id;
                delete legacy.id;
                needsSave = true;
            }
        }
        if (needsSave) {
            saveTasks();
        }
    }
    function saveTasks() {
        localStorage.setItem(storageKey, JSON.stringify(tasks));
    }
    function generateTaskId() {
        return "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    }
    let toastContainer = null;
    function toastContainerHtml() {
        return `<div id="toast-container" class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 items-end"></div>`;
    }
    function ensureToastContainer() {
        if (toastContainer)
            return toastContainer;
        document.body.insertAdjacentHTML("beforeend", toastContainerHtml());
        toastContainer = document.getElementById("toast-container");
        return toastContainer;
    }
    function toastHtml(message, kind) {
        const colorClasses = kind == "success"
            ? "bg-emerald-500 text-white"
            : "bg-red-500 text-white";
        const icon = kind == "success" ? "fa-circle-check" : "fa-circle-exclamation";
        return `
    <div class="${colorClasses} text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 transition-all duration-300 opacity-0 translate-y-[-8px]">
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    </div>
  `;
    }
    function showToast(message, kind) {
        const container = ensureToastContainer();
        container.insertAdjacentHTML("beforeend", toastHtml(message, kind));
        const toast = container.lastElementChild;
        requestAnimationFrame(function () {
            toast.classList.remove("opacity-0", "translate-y-[-8px]");
        });
        setTimeout(function () {
            toast.classList.add("opacity-0", "translate-y-[-8px]");
            setTimeout(function () {
                toast.remove();
            }, 300);
        }, 1500);
    }
    function formatTaskNumber(displayNumber) {
        let numStr = String(displayNumber);
        while (numStr.length < 3) {
            numStr = "0" + numStr;
        }
        return "#" + numStr;
    }
    function todayStr() {
        const now = new Date();
        const y = now.getFullYear();
        let m = String(now.getMonth() + 1);
        let d = String(now.getDate());
        if (m.length < 2)
            m = "0" + m;
        if (d.length < 2)
            d = "0" + d;
        return y + "-" + m + "-" + d;
    }
    function isOverdue(task) {
        if (task.status == "completed")
            return false;
        if (!task.dueDate)
            return false;
        return task.dueDate < todayStr();
    }
    function formatDueDate(dueDate) {
        if (!dueDate)
            return "";
        const parts = dueDate.split("-");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthIndex = parseInt(parts[1]) - 1;
        return months[monthIndex] + " " + parseInt(parts[2]);
    }
    function relativeTime(createdAt) {
        const diffMs = Date.now() - createdAt;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1)
            return "Just now";
        if (diffMin < 60)
            return diffMin + "m ago";
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24)
            return diffHour + "h ago";
        const diffDay = Math.floor(diffHour / 24);
        return diffDay + "d ago";
    }
    function statusDotColor(status) {
        if (status == "in-progress")
            return "bg-amber-400";
        if (status == "completed")
            return "bg-emerald-400";
        return "bg-slate-300";
    }
    function priorityBadge(priority) {
        if (priority == "high") {
            return `<span class="bg-red-50 text-red-600 text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wide">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            High Priority
          </span>`;
        }
        if (priority == "low") {
            return `<span class="bg-emerald-50 text-emerald-600 text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wide">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Low Priority
          </span>`;
        }
        return `<span class="bg-amber-50 text-amber-600 text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wide">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Medium Priority
          </span>`;
    }
    function findTaskById(taskId) {
        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].taskId == taskId)
                return tasks[i];
        }
        return null;
    }
    function openAddModal() {
        editingTaskId = null;
        modalTitle.textContent = "Create New Task";
        submitBtnText.textContent = "Add Task";
        taskForm.reset();
        taskPriorityInput.value = "medium";
        charCount.textContent = "0/500";
        clearErrors();
        modalOverlay.classList.remove("hidden");
        modalOverlay.classList.add("flex");
    }
    function openEditModal(taskId) {
        const task = findTaskById(taskId);
        if (!task)
            return;
        editingTaskId = taskId;
        modalTitle.textContent = "Edit Task";
        submitBtnText.textContent = "Save Changes";
        taskTitleInput.value = task.title;
        taskPriorityInput.value = task.priority;
        taskDueDateInput.value = task.dueDate;
        taskDescInput.value = task.description;
        charCount.textContent = task.description.length + "/500";
        clearErrors();
        modalOverlay.classList.remove("hidden");
        modalOverlay.classList.add("flex");
    }
    function closeModal() {
        modalOverlay.classList.add("hidden");
        modalOverlay.classList.remove("flex");
        taskForm.reset();
        editingTaskId = null;
    }
    function clearErrors() {
        titleError.classList.add("hidden");
        titleError.textContent = "";
        dateError.classList.add("hidden");
        taskTitleInput.classList.remove("border-red-400");
        taskDueDateInput.classList.remove("border-red-400");
    }
    function validTitle() {
        const regexTitle = /^[A-Za-z0-9\u0600-\u06FF][A-Za-z0-9\u0600-\u06FF ,.\-!?]{2,99}$/;
        const titleText = taskTitleInput.value.trim();
        if (titleText == "") {
            titleError.textContent = "Task title is required";
            titleError.classList.remove("hidden");
            taskTitleInput.classList.add("border-red-400");
            return false;
        }
        if (!regexTitle.test(titleText)) {
            titleError.textContent = "Title must be at least 3 characters";
            titleError.classList.remove("hidden");
            taskTitleInput.classList.add("border-red-400");
            return false;
        }
        titleError.classList.add("hidden");
        taskTitleInput.classList.remove("border-red-400");
        return true;
    }
    function validDueDate() {
        const regexDate = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
        const dueDate = taskDueDateInput.value;
        if (!dueDate) {
            dateError.classList.add("hidden");
            taskDueDateInput.classList.remove("border-red-400");
            return true;
        }
        if (!regexDate.test(dueDate)) {
            dateError.textContent = "Enter a valid date";
            dateError.classList.remove("hidden");
            taskDueDateInput.classList.add("border-red-400");
            return false;
        }
        if (dueDate >= todayStr()) {
            dateError.classList.add("hidden");
            taskDueDateInput.classList.remove("border-red-400");
            return true;
        }
        else {
            dateError.textContent = "Due date cannot be in the past";
            dateError.classList.remove("hidden");
            taskDueDateInput.classList.add("border-red-400");
            return false;
        }
    }
    function submitTask() {
        const title = taskTitleInput.value.trim();
        const description = taskDescInput.value.trim();
        const priority = taskPriorityInput.value;
        const dueDate = taskDueDateInput.value;
        if (validTitle() && validDueDate()) {
            if (editingTaskId) {
                updateTask(editingTaskId, title, description, priority, dueDate);
            }
            else {
                addTask(title, description, priority, dueDate);
            }
        }
    }
    function addTask(title, description, priority, dueDate) {
        const newTask = {
            taskId: generateTaskId(),
            title: title,
            description: description,
            priority: priority,
            dueDate: dueDate,
            status: "todo",
            createdAt: Date.now()
        };
        tasks.push(newTask);
        saveTasks();
        closeModal();
        displayTasks();
        showToast("Task added successfully!", "success");
    }
    function updateTask(taskId, title, description, priority, dueDate) {
        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].taskId == taskId) {
                tasks[i].title = title;
                tasks[i].description = description;
                tasks[i].priority = priority;
                tasks[i].dueDate = dueDate;
                break;
            }
        }
        saveTasks();
        closeModal();
        displayTasks();
        showToast("Task updated successfully!", "success");
    }
    function deleteTask(taskId) {
        const filtered = [];
        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].taskId != taskId) {
                filtered.push(tasks[i]);
            }
        }
        tasks = filtered;
        saveTasks();
        displayTasks();
    }
    function moveTask(taskId, newStatus) {
        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].taskId == taskId) {
                tasks[i].status = newStatus;
                break;
            }
        }
        saveTasks();
        displayTasks();
    }
    function emptyStateHtml() {
        return `
        <div class="flex flex-col items-center justify-center py-12 text-slate-400">
              <i class="fa-regular fa-folder-open text-4xl mb-3 opacity-50"></i>
              <p class="text-sm">No tasks yet</p>
              <p class="text-xs mt-1">Click + to add one</p>
            </div>
      `;
    }
    function actionButtonsHtml(task) {
        if (task.status == "todo") {
            return `
        <button class="status-btn text-[11px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 bg-amber-100 text-amber-700 hover:bg-amber-200" data-task-id="${task.taskId}" data-status="in-progress">
          <i class="fa-solid fa-play pointer-events-none"></i> <span class="pointer-events-none">Start</span>
        </button>
        <button class="status-btn text-[11px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 bg-emerald-100 text-emerald-700 hover:bg-emerald-200" data-task-id="${task.taskId}" data-status="completed">
          <i class="fa-solid fa-check pointer-events-none"></i> <span class="pointer-events-none">Complete</span>
        </button>
      `;
        }
        if (task.status == "in-progress") {
            return `
        <button class="status-btn text-[11px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 bg-slate-100 text-slate-600 hover:bg-slate-200" data-task-id="${task.taskId}" data-status="todo">
          <i class="fa-solid fa-rotate-left pointer-events-none"></i> <span class="pointer-events-none">To Do</span>
        </button>
        <button class="status-btn text-[11px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 bg-emerald-100 text-emerald-700 hover:bg-emerald-200" data-task-id="${task.taskId}" data-status="completed">
          <i class="fa-solid fa-check pointer-events-none"></i> <span class="pointer-events-none">Complete</span>
        </button>
      `;
        }
        return `
        <button class="status-btn text-[11px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 bg-slate-100 text-slate-600 hover:bg-slate-200" data-task-id="${task.taskId}" data-status="todo">
          <i class="fa-solid fa-rotate-left pointer-events-none"></i> <span class="pointer-events-none">To Do</span>
        </button>
        <button class="status-btn text-[11px] px-3 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95 bg-amber-100 text-amber-700 hover:bg-amber-200" data-task-id="${task.taskId}" data-status="in-progress">
          <i class="fa-solid fa-play pointer-events-none"></i> <span class="pointer-events-none">Start</span>
        </button>
      `;
    }
    function buildTaskCard(task, displayNumber) {
        const doneClass = task.status == "completed" ? "opacity-75" : "";
        const titleClass = task.status == "completed"
            ? "font-semibold text-slate-400 line-through mb-2 leading-snug"
            : "font-semibold text-slate-800 mb-2 leading-snug";
        const descHtml = task.description ? `
          <p class="text-slate-500 text-sm mb-4 leading-relaxed line-clamp-2">
            ${task.description}
          </p>
        ` : "";
        const overdueBadge = isOverdue(task) ? `
          <span class="bg-red-100 text-red-700 text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wide">
            <i class="fa-solid fa-triangle-exclamation"></i>
            Overdue
          </span>` : "";
        const dueDateHtml = task.dueDate ? `
            <div class="flex items-center gap-1.5 ${isOverdue(task) ? "text-red-400" : ""}">
              <i class="fa-regular fa-calendar"></i>
              <span>${formatDueDate(task.dueDate)}</span>
            </div>
          ` : "";
        return `
      <div class="group bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-200 ${doneClass}" data-task-id="${task.taskId}">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${statusDotColor(task.status)}"></span>
            <span class="text-[10px] font-medium text-slate-400 uppercase tracking-wider">${formatTaskNumber(displayNumber)}</span>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="edit-btn text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 w-7 h-7 rounded-lg flex items-center justify-center transition-colors" data-task-id="${task.taskId}" title="Edit task">
              <i class="fa-solid fa-pen text-xs pointer-events-none"></i>
            </button>
            <button class="delete-btn text-slate-400 hover:text-red-500 hover:bg-red-50 w-7 h-7 rounded-lg flex items-center justify-center transition-colors" data-task-id="${task.taskId}" title="Delete task">
              <i class="fa-solid fa-trash-can text-xs pointer-events-none"></i>
            </button>
          </div>
        </div>
        <h3 class="${titleClass}">
          ${task.title}
        </h3>
        ${descHtml}
        <div class="flex flex-wrap items-center gap-2 mb-4">
          ${priorityBadge(task.priority)}
          ${overdueBadge}
        </div>
        <div class="flex items-center gap-3 text-xs text-slate-400 pb-3 mb-3 border-b border-slate-100">
          ${dueDateHtml}
          <div class="flex items-center gap-1.5" title="Created ${new Date(task.createdAt).toLocaleString()}">
            <i class="fa-regular fa-clock"></i>
            <span>${relativeTime(task.createdAt)}</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          ${actionButtonsHtml(task)}
        </div>
      </div>
    `;
    }
    function displayTasks() {
        const boxes = {
            "todo": "",
            "in-progress": "",
            "completed": ""
        };
        const counts = {
            "todo": 0,
            "in-progress": 0,
            "completed": 0
        };
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            boxes[task.status] += buildTaskCard(task, i + 1);
            counts[task.status]++;
        }
        const statuses = ["todo", "in-progress", "completed"];
        for (let j = 0; j < statuses.length; j++) {
            const status = statuses[j];
            const container = document.getElementById("tasks-" + status);
            if (container) {
                container.innerHTML = boxes[status] == "" ? emptyStateHtml() : boxes[status];
            }
            const countEl = document.getElementById("count-" + status);
            if (countEl) {
                countEl.textContent = counts[status] == 1 ? "1 task" : counts[status] + " tasks";
            }
        }
    }
    addTaskBtn.addEventListener("click", function () {
        openAddModal();
    });
    closeModalBtn.addEventListener("click", function () {
        closeModal();
    });
    cancelBtn.addEventListener("click", function () {
        closeModal();
    });
    modalOverlay.addEventListener("click", function (e) {
        if (e.target == modalOverlay) {
            closeModal();
        }
    });
    taskTitleInput.addEventListener("input", function () {
        if (taskTitleInput.value.trim() != "") {
            titleError.classList.add("hidden");
            taskTitleInput.classList.remove("border-red-400");
        }
    });
    taskDescInput.addEventListener("input", function () {
        charCount.textContent = taskDescInput.value.length + "/500";
    });
    taskForm.addEventListener("submit", function (e) {
        e.preventDefault();
        submitTask();
    });
    columnsContainer.addEventListener("click", function (e) {
        const target = e.target;
        const editBtn = target.closest(".edit-btn");
        if (editBtn) {
            const editId = editBtn.getAttribute("data-task-id");
            openEditModal(editId);
            return;
        }
        const deleteBtn = target.closest(".delete-btn");
        if (deleteBtn) {
            const deleteId = deleteBtn.getAttribute("data-task-id");
            deleteTask(deleteId);
            return;
        }
        const statusBtn = target.closest(".status-btn");
        if (statusBtn) {
            const moveId = statusBtn.getAttribute("data-task-id");
            const newStatus = statusBtn.getAttribute("data-status");
            moveTask(moveId, newStatus);
        }
    });
})();
