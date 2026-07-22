// Web/src/api.ts
var ApiService = class {
  baseUrl;
  constructor() {
    this.baseUrl = "/api/v1";
  }
  async _fetch(endpoint, method = "GET", payload = null) {
    const url = `${this.baseUrl}/${endpoint}`;
    const options = {
      method,
      headers: {
        "Content-Type": "application/json"
      }
    };
    if (payload) {
      options.body = JSON.stringify(payload);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    if (method === "DELETE") {
      return { success: true };
    }
    return await response.json();
  }
  async getSubjects() {
    return this._fetch("subjects");
  }
  async saveSubject(s) {
    return s.id ? this._fetch("subjects", "PUT", s) : this._fetch("subjects", "POST", s);
  }
  async deleteSubject(id) {
    return this._fetch(`subjects/${id}`, "DELETE");
  }
  async getTeachers() {
    return this._fetch("teachers");
  }
  async saveTeacher(t) {
    return t.id ? this._fetch("teachers", "PUT", t) : this._fetch("teachers", "POST", t);
  }
  async deleteTeacher(id) {
    return this._fetch(`teachers/${id}`, "DELETE");
  }
  async getCourses() {
    return this._fetch("courses");
  }
  async saveCourse(c) {
    return c.id ? this._fetch("courses", "PUT", c) : this._fetch("courses", "POST", c);
  }
  async deleteCourse(id) {
    return this._fetch(`courses/${id}`, "DELETE");
  }
  async updateCourseGroup(courseId, newGroupsArray) {
    return this._fetch(`courses/${courseId}/groups`, "PUT", newGroupsArray);
  }
  async getSchedule() {
    return this._fetch("scheduledClasses");
  }
  async saveClass(cls) {
    return this._fetch("scheduledClasses", "POST", cls);
  }
  async updateClass(cls) {
    return this._fetch("scheduledClasses", "PUT", cls);
  }
  async deleteClass(id) {
    return this._fetch(`scheduledClasses/${id}`, "DELETE");
  }
};

// Web/src/utils.ts
function showToast(title, message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  let bgClass = type === "error" ? "border-red-500 text-red-500" : type === "success" ? "border-green-500 text-green-500" : type === "warning" ? "border-yellow-500 text-yellow-500" : "border-blue-500 text-blue-500";
  toast.className = `bg-white border-l-4 ${bgClass} shadow-lg rounded-r-lg p-4 w-80 transform transition-all duration-300 translate-y-4 opacity-0 flex gap-3`;
  toast.innerHTML = `<div><h4 class="text-sm font-bold text-gray-800">${title}</h4><p class="text-xs text-gray-600 mt-1">${message}</p></div>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.remove("translate-y-4", "opacity-0"), 10);
  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-x-full");
    setTimeout(() => toast.remove(), 300);
  }, 4e3);
}
function formatHours(h) {
  return Number(h.toFixed(2)).toString();
}

// Web/src/websocket.ts
var EngineWebSocket = class {
  isConnected;
  isOptimizing;
  wsUrl;
  callbacks;
  socket;
  constructor() {
    this.wsUrl = (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host + "/ws";
    this.isConnected = false;
    this.isOptimizing = false;
    this.callbacks = {};
    this.socket = null;
  }
  connect() {
    this.socket = new WebSocket(this.wsUrl);
    this.socket.onopen = () => {
      this.isConnected = true;
      this._trigger("connected");
    };
    this.socket.onclose = () => {
      this.isConnected = false;
      this._trigger("disconnected");
      setTimeout(() => this.connect(), 5e3);
    };
    this.socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "scores_updated") {
          this._trigger("scores_updated", { hard: msg.hard, soft: msg.soft });
        } else if (msg.type === "schedule_pushed") {
          this._trigger("schedule_pushed", msg.schedule);
        } else if (msg.type === "optimization_complete") {
          this._trigger("optimization_complete");
        } else if (msg.type === "optimization_stopped") {
          this.isOptimizing = false;
        }
      } catch (err) {
        console.error("Error parsing WS message:", err);
      }
    };
  }
  on(event, callback) {
    this.callbacks[event] = callback;
  }
  _trigger(event, data) {
    if (this.callbacks[event]) this.callbacks[event](data);
  }
  sendCommand(command, payload = {}) {
    try {
      if (!this.isConnected || !this.socket) {
        showToast("Error", "WebSocket Desconectado", "error");
        return;
      }
      this.socket.send(JSON.stringify({ command, payload }));
      if (command === "START") {
        this.isOptimizing = true;
        showToast("Motor Iniciado", "Servidor analizando el \xE1rbol de posibilidades (WS)...", "info");
      } else if (command === "STOP") {
        this.isOptimizing = false;
        showToast("Motor Pausado", "Optimizaci\xF3n detenida.", "warning");
      }
    } catch (err) {
      console.error("Error sending WS command:", err);
      showToast("Error de Comunicaci\xF3n", "No se pudo enviar el comando al servidor", "error");
      throw err;
    }
  }
};

// Web/src/calendar.ts
function updateDateRange() {
  if (!AppData.calendarInstance) return;
  const start = AppData.calendarInstance.getDateRangeStart();
  const end = AppData.calendarInstance.getDateRangeEnd();
  const formatDate = (date) => {
    const d = typeof date.toDate === "function" ? date.toDate() : new Date(date);
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };
  const rangeEl = document.getElementById("calendar-date-range");
  if (rangeEl) rangeEl.textContent = `${formatDate(start)} - ${formatDate(end)}`;
}
function onHeaderCourseChange(previousVal = null) {
  const courseSelect = document.getElementById("header-course-select");
  const select = document.getElementById("view-entity-select");
  if (!courseSelect || !select) return;
  const courseId = courseSelect.value;
  select.innerHTML = "";
  const course = AppData.courses.find((c) => c.id === courseId);
  if (course) {
    if (course.groups.length === 0) {
      select.innerHTML = `<option value="">Sin grupos</option>`;
    } else {
      course.groups.forEach((g) => select.innerHTML += `<option value="${g.id}">Grupo ${g.name}</option>`);
    }
  }
  if (previousVal && Array.from(select.options).some((opt) => opt.value === previousVal)) {
    select.value = previousVal;
  }
  refreshCalendarView();
}
function initCalendar() {
  if (typeof tui === "undefined") return;
  const Calendar = tui.Calendar;
  AppData.calendarInstance = new Calendar("#calendar", {
    defaultView: "week",
    useFormPopup: false,
    useDetailPopup: false,
    week: { taskView: false, eventView: ["time"], dayNames: ["Dom", "Lunes", "Martes", "Mi\xE9rcoles", "Jueves", "Viernes", "S\xE1b"], workweek: true, hourStart: 8, hourEnd: 15 },
    template: {
      weekDayName(model) {
        return `<span class="toastui-calendar-day-name-item">${model.dayName}</span>`;
      }
    }
  });
  AppData.calendarInstance.on("selectDateTime", function(info) {
    AppData.calendarInstance.clearGridSelections();
    let startObj = typeof info.start.toDate === "function" ? info.start.toDate() : new Date(info.start);
    let endObj = typeof info.end.toDate === "function" ? info.end.toDate() : new Date(info.end);
    openAddClassModal(startObj, endObj);
  });
  AppData.calendarInstance.on("beforeUpdateEvent", async function(info) {
    const { event, changes } = info;
    let cls = AppData.scheduledClasses.find((c) => c.id === event.id);
    if (!cls) return;
    if (cls.isPinned) {
      showToast("Bloqueado", "No puedes mover ni alterar una clase que est\xE1 fijada (Pin).", "warning");
      return;
    }
    if (changes.start) cls.start = typeof changes.start.toDate === "function" ? changes.start.toDate() : new Date(changes.start);
    if (changes.end) cls.end = typeof changes.end.toDate === "function" ? changes.end.toDate() : new Date(changes.end);
    cls.duration = (new Date(cls.end).getTime() - new Date(cls.start).getTime()) / (1e3 * 60 * 60);
    AppData.calendarInstance.updateEvent(event.id, event.calendarId, changes);
    showToast("Sincronizando...", "Guardando nueva posici\xF3n en el servidor...", "info");
    await AppData.API.updateClass(cls);
    AppData.WS.sendCommand("MANUAL_EDIT", { id: cls.id, action: "moved" });
  });
  AppData.calendarInstance.on("clickEvent", (e) => openEventDetail(e.event));
}
function openAddClassModal(startDate = null, endDate = null) {
  if (!startDate) {
    const now = /* @__PURE__ */ new Date();
    const diff = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1);
    startDate = new Date(now.setDate(diff));
    startDate.setHours(9, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setHours(10, 0, 0, 0);
  }
  const formatTime = (date) => date.toTimeString().slice(0, 5);
  document.getElementById("modal-class-start").value = startDate.toISOString();
  document.getElementById("modal-class-end").value = endDate.toISOString();
  document.getElementById("modal-time-start").value = formatTime(startDate);
  document.getElementById("modal-time-end").value = formatTime(endDate);
  const typeSelect = document.getElementById("view-type-select");
  const headerCourseSelect = document.getElementById("header-course-select");
  const viewEntitySelect = document.getElementById("view-entity-select");
  const viewType = typeSelect?.value;
  const viewCourse = headerCourseSelect?.value;
  const viewEntity = viewEntitySelect?.value;
  const subjSelect = document.getElementById("modal-subject");
  const courseSelect = document.getElementById("modal-course");
  const groupSelect = document.getElementById("modal-group");
  const teacherSelect = document.getElementById("modal-teacher");
  subjSelect.innerHTML = AppData.subjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
  courseSelect.innerHTML = AppData.courses.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  teacherSelect.innerHTML = AppData.teachers.map((t) => `<option value="${t.id}">${t.name}</option>`).join("");
  courseSelect.disabled = false;
  groupSelect.disabled = false;
  teacherSelect.disabled = false;
  if (viewType === "group" && viewCourse) {
    courseSelect.value = viewCourse;
    courseSelect.disabled = true;
    onModalCourseChange();
    if (viewEntity) {
      groupSelect.value = viewEntity;
      groupSelect.disabled = true;
    }
  } else if (viewType === "teacher" && viewEntity) {
    teacherSelect.value = viewEntity;
    teacherSelect.disabled = true;
    onModalCourseChange();
    const teacherObj = AppData.teachers.find((t) => t.id === viewEntity);
    if (teacherObj && teacherObj.subjects && teacherObj.subjects.length > 0) {
      subjSelect.value = teacherObj.subjects[0];
    }
  } else {
    onModalCourseChange();
  }
  const modal = document.getElementById("add-class-modal");
  if (modal) modal.classList.replace("hidden", "flex");
}
function onModalCourseChange() {
  const courseId = document.getElementById("modal-course").value;
  const groupSelect = document.getElementById("modal-group");
  groupSelect.innerHTML = "";
  const course = AppData.courses.find((c) => c.id === courseId);
  if (course && course.groups.length > 0) {
    course.groups.forEach((g) => {
      groupSelect.innerHTML += `<option value="${g.id}">Grupo ${g.name}</option>`;
    });
  } else {
    groupSelect.innerHTML = `<option value="">(Sin grupos)</option>`;
  }
}
function closeAddClassModal() {
  const modal = document.getElementById("add-class-modal");
  if (modal) modal.classList.replace("flex", "hidden");
}
async function saveNewClass() {
  const baseStartStr = document.getElementById("modal-class-start").value;
  const baseEndStr = document.getElementById("modal-class-end").value;
  const baseStart = new Date(baseStartStr);
  const baseEnd = new Date(baseEndStr);
  const timeStartStr = document.getElementById("modal-time-start").value.split(":");
  const timeEndStr = document.getElementById("modal-time-end").value.split(":");
  baseStart.setHours(parseInt(timeStartStr[0]), parseInt(timeStartStr[1]), 0, 0);
  baseEnd.setHours(parseInt(timeEndStr[0]), parseInt(timeEndStr[1]), 0, 0);
  const subjId = document.getElementById("modal-subject").value;
  const groupId = document.getElementById("modal-group").value;
  const teacherId = document.getElementById("modal-teacher").value;
  if (!groupId || !teacherId) {
    showToast("Error", "Faltan datos por seleccionar (Grupo o Profesor)", "error");
    return;
  }
  const durationInMs = baseEnd.getTime() - baseStart.getTime();
  const durationInHours = durationInMs / (1e3 * 60 * 60);
  let nuevaClase = {
    id: "evt-" + Date.now(),
    start: baseStart.toISOString(),
    end: baseEnd.toISOString(),
    duration: durationInHours,
    subjectId: subjId,
    groupId,
    teacherId,
    isPinned: false
  };
  showToast("Guardando...", "Enviando bloque a la base de datos API", "info");
  await AppData.API.saveClass(nuevaClase);
  AppData.scheduledClasses.push(nuevaClase);
  closeAddClassModal();
  refreshCalendarView();
  AppData.WS.sendCommand("MANUAL_EDIT", { id: nuevaClase.id });
}
function refreshCalendarView() {
  const typeSelect = document.getElementById("view-type-select");
  const entitySelect = document.getElementById("view-entity-select");
  if (!typeSelect || !entitySelect) return;
  const type = typeSelect.value;
  const entityId = entitySelect.value;
  if (AppData.calendarInstance) AppData.calendarInstance.clear();
  if (!entityId) return;
  const events = AppData.scheduledClasses.filter((cls) => {
    if (type === "teacher") return cls.teacherId === entityId;
    if (type === "group") return cls.groupId === entityId;
    return false;
  }).map((cls) => {
    const subject = AppData.subjects.find((s) => s.id === cls.subjectId);
    const teacher = AppData.teachers.find((t) => t.id === cls.teacherId);
    const course = AppData.courses.find((c) => c.groups.some((g) => g.id === cls.groupId));
    const group = course ? course.groups.find((g) => g.id === cls.groupId) : null;
    return {
      id: cls.id,
      calendarId: cls.teacherId,
      title: subject ? subject.name : "Clase API",
      body: `${course ? course.name : ""} ${group ? " - G." + group.name : ""}<br/>Prof: ${teacher ? teacher.name : ""}`,
      start: cls.start,
      end: cls.end,
      isReadOnly: cls.isPinned || false,
      backgroundColor: teacher ? teacher.color : "#cbd5e1",
      color: "#ffffff",
      customStyle: { borderRadius: "6px", border: "none", padding: "4px" }
    };
  });
  if (AppData.calendarInstance) AppData.calendarInstance.createEvents(events);
}
function openEventDetail(event) {
  const cls = AppData.scheduledClasses.find((c) => c.id === event.id);
  if (!cls) return;
  const subject = AppData.subjects.find((s) => s.id === cls.subjectId);
  const teacher = AppData.teachers.find((t) => t.id === cls.teacherId);
  if (!subject || !teacher) return;
  const titleEl = document.getElementById("event-detail-title");
  if (titleEl) titleEl.textContent = subject.name;
  const headerEl = document.getElementById("event-detail-header");
  if (headerEl) headerEl.style.backgroundColor = teacher.color;
  const bodyEl = document.getElementById("event-detail-body");
  if (bodyEl) bodyEl.innerHTML = `<p class="text-sm">Impartida por: <b>${teacher.name}</b></p>`;
  const pinBtn = document.getElementById("btn-pin-event");
  if (pinBtn) {
    pinBtn.innerText = cls.isPinned ? "Desfijar" : "Fijar (Pin)";
    pinBtn.onclick = async () => {
      cls.isPinned = !cls.isPinned;
      await AppData.API.updateClass(cls);
      AppData.WS.sendCommand("PIN_UPDATE", { id: cls.id, state: cls.isPinned });
      closeEventDetail();
      refreshCalendarView();
    };
  }
  const delBtn = document.getElementById("btn-delete-event");
  if (delBtn) {
    delBtn.onclick = async () => {
      await AppData.API.deleteClass(cls.id);
      AppData.scheduledClasses = AppData.scheduledClasses.filter((c) => c.id !== cls.id);
      AppData.WS.sendCommand("MANUAL_EDIT", { delete: cls.id });
      closeEventDetail();
      refreshCalendarView();
    };
  }
  const modal = document.getElementById("event-detail-modal");
  if (modal) modal.classList.replace("hidden", "flex");
}
function closeEventDetail() {
  const modal = document.getElementById("event-detail-modal");
  if (modal) modal.classList.replace("flex", "hidden");
}

// Web/src/crud.ts
var currentCrudType = "";
var currentCrudId = null;
var currentCourseIdForGroup = "";
var currentGroupIdForGroup = null;
function openFormModal(type, id = null) {
  currentCrudType = type;
  currentCrudId = id;
  const titleEl = document.getElementById("crud-modal-title");
  const bodyEl = document.getElementById("crud-modal-body");
  if (!titleEl || !bodyEl) return;
  if (type === "subject") {
    titleEl.textContent = id ? "Editar Asignatura" : "Nueva Asignatura";
    const s = id ? AppData.subjects.find((x) => x.id === id) : null;
    bodyEl.innerHTML = `
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Asignatura</label>
                    <input type="text" id="crud-subject-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${s?.name || ""}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Horas Semanales</label>
                    <input type="number" id="crud-subject-hours" required min="0.5" step="0.5" class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${s?.hours || 4}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Curso Asociado</label>
                    <select id="crud-subject-course" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                        ${AppData.courses.map((c) => `<option value="${c.id}" ${s?.courseId === c.id ? "selected" : ""}>${c.name}</option>`).join("")}
                    </select>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
                </div>
            </form>
        `;
  } else if (type === "teacher") {
    titleEl.textContent = id ? "Editar Profesor" : "Nuevo Profesor";
    const t = id ? AppData.teachers.find((x) => x.id === id) : null;
    bodyEl.innerHTML = `
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Profesor</label>
                    <input type="text" id="crud-teacher-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${t?.name || ""}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Horas M\xE1ximas Semanales</label>
                    <input type="number" id="crud-teacher-max-hours" required min="1" class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${t?.maxHours || 22.5}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Color Identificativo</label>
                    <div class="flex gap-2 items-center">
                        <input type="color" id="crud-teacher-color" required class="w-10 h-10 border border-gray-300 rounded cursor-pointer" value="${t?.color || "#4f46e5"}">
                        <span class="text-xs text-gray-500">Color visual en el calendario.</span>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Especialidades (Materias habilitadas)</label>
                    <div class="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                        ${AppData.subjects.map((s) => `
                            <label class="flex items-center gap-2 cursor-pointer text-sm">
                                <input type="checkbox" name="crud-teacher-subjects" value="${s.id}" ${t?.subjects.includes(s.id) ? "checked" : ""} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                <span>${s.name}</span>
                            </label>
                        `).join("")}
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
                </div>
            </form>
        `;
  } else if (type === "course") {
    titleEl.textContent = id ? "Editar Curso" : "Nuevo Curso";
    const c = id ? AppData.courses.find((x) => x.id === id) : null;
    bodyEl.innerHTML = `
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Curso</label>
                    <input type="text" id="crud-course-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${c?.name || ""}">
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
                </div>
            </form>
        `;
  }
  const modal = document.getElementById("crud-modal");
  if (modal) modal.classList.replace("hidden", "flex");
  const form = document.getElementById("form-crud");
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (type === "subject") {
        const name = document.getElementById("crud-subject-name").value;
        const hours = parseFloat(document.getElementById("crud-subject-hours").value);
        const courseId = document.getElementById("crud-subject-course").value;
        try {
          await AppData.API.saveSubject({ id: currentCrudId || void 0, name, hours, courseId });
          showToast("\xC9xito", "Asignatura guardada correctamente", "success");
          closeCrudModal();
          renderSubjects();
        } catch (err) {
          showToast("Error", "No se pudo guardar la asignatura", "error");
        }
      } else if (type === "teacher") {
        const name = document.getElementById("crud-teacher-name").value;
        const maxHours = parseFloat(document.getElementById("crud-teacher-max-hours").value);
        const color = document.getElementById("crud-teacher-color").value;
        const checkboxes = document.querySelectorAll('input[name="crud-teacher-subjects"]:checked');
        const subjects = Array.from(checkboxes).map((cb) => cb.value);
        try {
          await AppData.API.saveTeacher({ id: currentCrudId || void 0, name, maxHours, color, subjects });
          showToast("\xC9xito", "Profesor guardado correctamente", "success");
          closeCrudModal();
          renderTeachers();
        } catch (err) {
          showToast("Error", "No se pudo guardar el profesor", "error");
        }
      } else if (type === "course") {
        const name = document.getElementById("crud-course-name").value;
        try {
          await AppData.API.saveCourse({ id: currentCrudId || void 0, name });
          showToast("\xC9xito", "Curso guardado correctamente", "success");
          closeCrudModal();
          renderCourses();
        } catch (err) {
          showToast("Error", "No se pudo guardar el curso", "error");
        }
      }
    };
  }
}
function openGroupModal(courseId, groupId = null) {
  currentCourseIdForGroup = courseId;
  currentGroupIdForGroup = groupId;
  const course = AppData.courses.find((x) => x.id === courseId);
  if (!course) return;
  const group = groupId ? course.groups.find((g) => g.id === groupId) : null;
  const titleEl = document.getElementById("crud-modal-title");
  if (titleEl) titleEl.textContent = groupId ? "Editar Grupo" : "Nuevo Grupo";
  const body = document.getElementById("crud-modal-body");
  if (!body) return;
  body.innerHTML = `
        <form id="form-group-crud" class="space-y-4">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Grupo (Letra/Identificador)</label>
                <input type="text" id="crud-group-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${group?.name || ""}">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Tutor del Grupo</label>
                <select id="crud-group-tutor" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    ${AppData.teachers.map((t) => `<option value="${t.id}" ${group?.tutorId === t.id ? "selected" : ""}>${t.name}</option>`).join("")}
                </select>
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
            </div>
        </form>
    `;
  const modal = document.getElementById("crud-modal");
  if (modal) modal.classList.replace("hidden", "flex");
  const form = document.getElementById("form-group-crud");
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById("crud-group-name").value;
      const tutorId = document.getElementById("crud-group-tutor").value;
      try {
        const courseObj = AppData.courses.find((x) => x.id === currentCourseIdForGroup);
        if (!courseObj) return;
        if (currentGroupIdForGroup) {
          const g = courseObj.groups.find((x) => x.id === currentGroupIdForGroup);
          if (g) {
            g.name = name;
            g.tutorId = tutorId;
          }
        } else {
          const newGroup = {
            id: "temp-" + Date.now(),
            name,
            tutorId,
            assignments: {}
          };
          courseObj.groups.push(newGroup);
        }
        await AppData.API.updateCourseGroup(currentCourseIdForGroup, courseObj.groups);
        showToast("\xC9xito", "Grupo guardado correctamente", "success");
        closeCrudModal();
        renderCourses();
      } catch (err) {
        showToast("Error", "No se pudo guardar el grupo", "error");
      }
    };
  }
}
function closeCrudModal() {
  const modal = document.getElementById("crud-modal");
  if (modal) modal.classList.replace("flex", "hidden");
}
async function renderSubjects() {
  try {
    AppData.subjects = await AppData.API.getSubjects();
    const tbody = document.getElementById("table-subjects");
    if (!tbody) return;
    tbody.innerHTML = "";
    AppData.subjects.forEach((s) => {
      tbody.innerHTML += `
                <tr class="hover:bg-gray-50 border-b border-gray-100 text-sm">
                    <td class="p-4 font-medium text-gray-800">${s.name}</td>
                    <td class="p-4 text-center text-gray-600">${formatHours(s.hours)} h</td>
                    <td class="p-4 text-center">
                        <button onclick="openFormModal('subject', '${s.id}')" class="text-indigo-600 hover:text-indigo-900 font-semibold mr-3">Editar</button>
                        <button onclick="deleteSubject('${s.id}')" class="text-red-600 hover:text-red-900 font-semibold">Eliminar</button>
                    </td>
                </tr>
            `;
    });
  } catch (err) {
    console.error(err);
    showToast("Error", "No se pudieron cargar las asignaturas", "error");
  }
}
async function deleteSubject(id) {
  if (confirm("\xBFEst\xE1s seguro de que deseas eliminar esta asignatura?")) {
    try {
      await AppData.API.deleteSubject(id);
      showToast("\xC9xito", "Asignatura eliminada correctamente", "success");
      renderSubjects();
    } catch (err) {
      showToast("Error", "No se pudo eliminar la asignatura", "error");
    }
  }
}
async function renderTeachers() {
  try {
    AppData.teachers = await AppData.API.getTeachers();
    const list = document.getElementById("list-teachers");
    if (!list) return;
    list.innerHTML = "";
    AppData.teachers.forEach((t) => {
      const subjNames = t.subjects.map((sId) => {
        const s = AppData.subjects.find((x) => x.id === sId);
        return s ? s.name : "";
      }).filter((n) => n !== "").join(", ");
      list.innerHTML += `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold text-gray-800 text-lg">${t.name}</h3>
                            <span class="w-4 h-4 rounded-full border border-gray-300" style="background-color: ${t.color}"></span>
                        </div>
                        <p class="text-sm text-gray-500 mb-1">Max: <b>${formatHours(t.maxHours)} h / semana</b></p>
                        <p class="text-xs text-gray-600 mt-2 italic truncate" title="${subjNames || "Sin especialidades"}">
                            Especialidades: ${subjNames || "Ninguna"}
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
                        <button onclick="openFormModal('teacher', '${t.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-semibold">Editar</button>
                        <button onclick="deleteTeacher('${t.id}')" class="text-red-600 hover:text-red-900 text-xs font-semibold">Eliminar</button>
                    </div>
                </div>
            `;
    });
  } catch (err) {
    console.error(err);
    showToast("Error", "No se pudieron cargar los profesores", "error");
  }
}
async function deleteTeacher(id) {
  if (confirm("\xBFEst\xE1s seguro de que deseas eliminar este profesor?")) {
    try {
      await AppData.API.deleteTeacher(id);
      showToast("\xC9xito", "Profesor eliminado correctamente", "success");
      renderTeachers();
    } catch (err) {
      showToast("Error", "No se pudo eliminar al profesor", "error");
    }
  }
}
async function renderCourses() {
  try {
    AppData.courses = await AppData.API.getCourses();
    AppData.teachers = await AppData.API.getTeachers();
    const container = document.getElementById("list-courses");
    if (!container) return;
    container.innerHTML = "";
    AppData.courses.forEach((c) => {
      let groupsHtml = "";
      if (c.groups.length === 0) {
        groupsHtml = '<p class="text-xs text-gray-400 italic">No hay grupos creados en este curso.</p>';
      } else {
        groupsHtml = `
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        ${c.groups.map((g) => {
          const tutor = AppData.teachers.find((t) => t.id === g.tutorId);
          return `
                                <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                                    <div>
                                        <h4 class="font-semibold text-gray-700 text-sm">Grupo ${g.name}</h4>
                                        <p class="text-xs text-gray-500">Tutor: ${tutor ? tutor.name : "Sin asignar"}</p>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="openGroupModal('${c.id}', '${g.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold">Editar</button>
                                        <button onclick="deleteGroup('${c.id}', '${g.id}')" class="text-red-600 hover:text-red-900 text-xs font-bold">Borrar</button>
                                    </div>
                                </div>
                            `;
        }).join("")}
                    </div>
                `;
      }
      container.innerHTML += `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
                    <div class="flex items-center justify-between border-b pb-2">
                        <h3 class="font-bold text-gray-800 text-lg">${c.name}</h3>
                        <div class="flex gap-3">
                            <button onclick="openGroupModal('${c.id}')" class="text-emerald-600 hover:text-emerald-800 text-xs font-bold">+ A\xF1adir Grupo</button>
                            <button onclick="openFormModal('course', '${c.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold">Editar Curso</button>
                            <button onclick="deleteCourse('${c.id}')" class="text-red-600 hover:text-red-900 text-xs font-bold">Eliminar Curso</button>
                        </div>
                    </div>
                    ${groupsHtml}
                </div>
            `;
    });
  } catch (err) {
    console.error(err);
    showToast("Error", "No se pudieron cargar los cursos", "error");
  }
}
async function deleteCourse(id) {
  if (confirm("\xBFEst\xE1s seguro de que deseas eliminar este curso y todos sus grupos?")) {
    try {
      await AppData.API.deleteCourse(id);
      showToast("\xC9xito", "Curso eliminado correctamente", "success");
      renderCourses();
    } catch (err) {
      showToast("Error", "No se pudo eliminar el curso", "error");
    }
  }
}
async function deleteGroup(courseId, groupId) {
  if (confirm("\xBFEst\xE1s seguro de que deseas eliminar este grupo?")) {
    try {
      const course = AppData.courses.find((x) => x.id === courseId);
      if (!course) return;
      const updatedGroups = course.groups.filter((g) => g.id !== groupId);
      await AppData.API.updateCourseGroup(courseId, updatedGroups);
      showToast("\xC9xito", "Grupo eliminado correctamente", "success");
      renderCourses();
    } catch (err) {
      showToast("Error", "No se pudo eliminar el grupo", "error");
    }
  }
}
async function renderAssignmentsList() {
  try {
    AppData.courses = await AppData.API.getCourses();
    AppData.subjects = await AppData.API.getSubjects();
    AppData.teachers = await AppData.API.getTeachers();
    const container = document.getElementById("assignments-list");
    if (!container) return;
    container.innerHTML = "";
    if (AppData.courses.length === 0) {
      container.innerHTML = '<p class="text-gray-500 italic">No hay cursos creados. Crea primero un curso y grupos.</p>';
      return;
    }
    AppData.courses.forEach((c) => {
      const courseSubjects = AppData.subjects.filter((s) => s.courseId === c.id);
      if (c.groups.length === 0) return;
      let groupsAssignmentsHtml = "";
      c.groups.forEach((g) => {
        let subjectsTableHtml = "";
        if (courseSubjects.length === 0) {
          subjectsTableHtml = '<tr><td colspan="2" class="p-3 text-xs text-gray-400 italic">No hay asignaturas en este curso.</td></tr>';
        } else {
          courseSubjects.forEach((s) => {
            const assignedTeacherId = g.assignments[s.id] || "";
            const qualifiedTeachers = AppData.teachers.filter((t) => t.subjects.includes(s.id));
            subjectsTableHtml += `
                            <tr class="border-b border-gray-100 last:border-0">
                                <td class="py-2 text-sm font-medium text-gray-700">${s.name} (${formatHours(s.hours)}h)</td>
                                <td class="py-2">
                                    <select onchange="updateAssignment('${c.id}', '${g.id}', '${s.id}', this.value)" class="w-full text-xs border border-gray-300 rounded p-1 outline-none bg-white focus:ring-1 focus:ring-indigo-500">
                                        <option value="">-- Sin asignar --</option>
                                        ${AppData.teachers.map((t) => {
              const isQualified = qualifiedTeachers.some((qt) => qt.id === t.id);
              const label = isQualified ? t.name : `${t.name} (No especialista)`;
              return `<option value="${t.id}" ${assignedTeacherId === t.id ? "selected" : ""}>${label}</option>`;
            }).join("")}
                                    </select>
                                </td>
                            </tr>
                        `;
          });
        }
        groupsAssignmentsHtml += `
                    <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 class="font-bold text-gray-700 mb-2 border-b pb-1 text-sm">Grupo ${g.name}</h4>
                        <table class="w-full">
                            <tbody>
                                ${subjectsTableHtml}
                            </tbody>
                        </table>
                    </div>
                `;
      });
      container.innerHTML += `
                <div class="mb-8 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <h3 class="font-bold text-gray-800 text-lg border-b pb-2">${c.name}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${groupsAssignmentsHtml}
                    </div>
                </div>
            `;
    });
  } catch (err) {
    console.error(err);
    showToast("Error", "No se pudieron cargar las asignaciones", "error");
  }
}
async function updateAssignment(courseId, groupId, subjectId, teacherId) {
  try {
    const course = AppData.courses.find((x) => x.id === courseId);
    if (!course) return;
    const group = course.groups.find((g) => g.id === groupId);
    if (!group) return;
    if (teacherId === "") {
      delete group.assignments[subjectId];
    } else {
      group.assignments[subjectId] = teacherId;
    }
    await AppData.API.updateCourseGroup(courseId, course.groups);
    showToast("\xC9xito", "Asignaci\xF3n actualizada", "success");
  } catch (err) {
    showToast("Error", "No se pudo guardar la asignaci\xF3n", "error");
  }
}

// Web/src/Datos.ts
var AppData = {
  API: new ApiService(),
  WS: new EngineWebSocket(),
  subjects: [],
  teachers: [],
  courses: [],
  scheduledClasses: [],
  calendarInstance: null,
  currentEventContext: null
};
window.onload = async function() {
  try {
    AppData.subjects = await AppData.API.getSubjects();
    AppData.teachers = await AppData.API.getTeachers();
    AppData.courses = await AppData.API.getCourses();
    AppData.scheduledClasses = await AppData.API.getSchedule();
    const loader = document.getElementById("app-loader");
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => loader.remove(), 300);
    }
    initCalendar();
    updateEntitySelector2();
    updateDateRange();
    AppData.WS.connect();
    setupWebSocketsListeners();
  } catch (err) {
    console.error("Init Error:", err);
    const loaderText = document.getElementById("loader-text");
    if (loaderText) {
      loaderText.textContent = "Error conectando con la API. Aseg\xFArese de que el servidor Ktor est\xE9 encendido.";
      loaderText.className = "mt-4 text-red-600 font-bold px-4 text-center";
    }
  }
};
function setupWebSocketsListeners() {
  const btn = document.getElementById("btn-toggle-engine");
  const wsStatus = document.getElementById("ws-status");
  AppData.WS.on("connected", () => {
    if (btn) {
      btn.disabled = false;
      btn.classList.replace("bg-gray-400", "bg-emerald-600");
      btn.classList.add("hover:bg-emerald-700");
      btn.classList.remove("cursor-not-allowed");
    }
    const textBtn = document.getElementById("text-engine-btn");
    if (textBtn) textBtn.textContent = "Generar (WS)";
    if (wsStatus) {
      wsStatus.innerHTML = '<span class="relative flex h-2.5 w-2.5 mr-1.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span> Conectado';
    }
  });
  AppData.WS.on("disconnected", () => {
    if (btn) {
      btn.disabled = true;
      btn.classList.replace("bg-emerald-600", "bg-gray-400");
      btn.classList.remove("hover:bg-emerald-700");
      btn.classList.add("cursor-not-allowed");
    }
    const textBtn = document.getElementById("text-engine-btn");
    if (textBtn) textBtn.textContent = "Conectando...";
    if (wsStatus) {
      wsStatus.innerHTML = '<span class="relative flex h-2.5 w-2.5 mr-1.5"><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span> Desconectado';
    }
  });
  AppData.WS.on("scores_updated", (scores) => {
    const elHard = document.getElementById("score-hard");
    const elSoft = document.getElementById("score-soft");
    if (elHard) elHard.textContent = scores.hard.toString();
    if (elSoft) elSoft.textContent = scores.soft.toString();
    const stConflict = document.getElementById("status-conflict");
    const stOk = document.getElementById("status-ok");
    if (stConflict && stOk) {
      if (scores.hard === 0) {
        stConflict.classList.replace("flex", "hidden");
        stOk.classList.replace("hidden", "flex");
      } else {
        stOk.classList.replace("flex", "hidden");
        stConflict.classList.replace("hidden", "flex");
      }
    }
  });
  AppData.WS.on("optimization_complete", () => {
    toggleOptimizationEngine(true);
    showToast("\xA1Matem\xE1ticamente Correcto!", "El servidor WS ha encontrado la disposici\xF3n perfecta.", "success");
  });
  AppData.WS.on("schedule_pushed", (newScheduleFromDB) => {
    AppData.scheduledClasses = newScheduleFromDB;
    refreshCalendarView();
  });
}
function toggleOptimizationEngine(forceStop = false) {
  try {
    const btn = document.getElementById("btn-toggle-engine");
    if (!btn) return;
    const iconStop = document.getElementById("icon-stop");
    const iconPlay = document.getElementById("icon-play");
    const textEngineBtn = document.getElementById("text-engine-btn");
    if (AppData.WS.isOptimizing || forceStop) {
      AppData.WS.sendCommand("STOP");
      btn.classList.replace("bg-red-600", "bg-emerald-600");
      btn.classList.replace("hover:bg-red-700", "hover:bg-emerald-700");
      btn.classList.remove("animate-pulse");
      if (iconStop) iconStop.classList.add("hidden");
      if (iconPlay) iconPlay.classList.remove("hidden");
      if (textEngineBtn) textEngineBtn.textContent = "Generar (WS)";
    } else {
      AppData.WS.sendCommand("START");
      btn.classList.replace("bg-emerald-600", "bg-red-600");
      btn.classList.replace("hover:bg-red-700", "hover:bg-red-700");
      btn.classList.add("animate-pulse");
      if (iconPlay) iconPlay.classList.add("hidden");
      if (iconStop) iconStop.classList.remove("hidden");
      if (textEngineBtn) textEngineBtn.textContent = "Parar Motor";
    }
  } catch (err) {
    console.error("Error in toggleOptimizationEngine:", err);
    showToast("Error", "No se pudo iniciar el motor de optimizaci\xF3n", "error");
  }
}
function switchTab(tabId) {
  document.querySelectorAll(".view-tab").forEach((el) => el.classList.remove("active"));
  const targetTab = document.getElementById(`view-${tabId}`);
  if (targetTab) targetTab.classList.add("active");
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("bg-indigo-600", "text-white", "shadow-inner");
    btn.classList.add("text-slate-300");
  });
  const activeBtn = document.getElementById(`nav-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.remove("text-slate-300");
    activeBtn.classList.add("bg-indigo-600", "text-white", "shadow-inner");
  }
  const headerCalendar = document.getElementById("header-calendar");
  if (headerCalendar) {
    headerCalendar.style.display = tabId === "calendar" ? "flex" : "none";
  }
  if (tabId === "subjects") renderSubjects();
  if (tabId === "teachers") renderTeachers();
  if (tabId === "courses") renderCourses();
  if (tabId === "assignments") renderAssignmentsList();
  if (tabId === "calendar") {
    setTimeout(() => {
      if (AppData.calendarInstance) AppData.calendarInstance.render();
      updateEntitySelector2();
      updateDateRange();
    }, 50);
  }
}
function updateEntitySelector2() {
  const typeSelect = document.getElementById("view-type-select");
  const courseSelect = document.getElementById("header-course-select");
  const courseSeparator = document.getElementById("header-course-separator");
  const entitySelect = document.getElementById("view-entity-select");
  if (!typeSelect || !courseSelect || !entitySelect || !courseSeparator) return;
  const type = typeSelect.value;
  const currentCourseValue = courseSelect.value;
  const currentValue = entitySelect.value;
  if (type === "group") {
    courseSelect.classList.remove("hidden");
    courseSeparator.classList.remove("hidden");
    courseSelect.innerHTML = "";
    AppData.courses.forEach((c) => courseSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`);
    if (currentCourseValue && Array.from(courseSelect.options).some((opt) => opt.value === currentCourseValue)) {
      courseSelect.value = currentCourseValue;
    }
    onHeaderCourseChange(currentValue);
  } else {
    courseSelect.classList.add("hidden");
    courseSeparator.classList.add("hidden");
    entitySelect.innerHTML = "";
    AppData.teachers.forEach((t) => entitySelect.innerHTML += `<option value="${t.id}">${t.name}</option>`);
    if (currentValue && Array.from(entitySelect.options).some((opt) => opt.value === currentValue)) {
      entitySelect.value = currentValue;
    }
    refreshCalendarView();
  }
}
function onHeaderCourseChangeWrapper() {
  onHeaderCourseChange(null);
}
Object.assign(window, {
  AppData,
  switchTab,
  updateEntitySelector: updateEntitySelector2,
  onHeaderCourseChange: onHeaderCourseChangeWrapper,
  toggleOptimizationEngine,
  openFormModal,
  closeCrudModal,
  openGroupModal,
  deleteSubject,
  deleteTeacher,
  deleteCourse,
  deleteGroup,
  updateAssignment,
  saveNewClass,
  closeAddClassModal,
  openAddClassModal,
  onModalCourseChange,
  closeEventDetail,
  refreshCalendarView,
  updateDateRange,
  showToast
});
export {
  AppData,
  setupWebSocketsListeners,
  switchTab,
  toggleOptimizationEngine,
  updateEntitySelector2 as updateEntitySelector
};
