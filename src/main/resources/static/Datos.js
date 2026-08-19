(() => {
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
    async getConfig() {
      return this._fetch("config");
    }
    async saveConfig(c) {
      return this._fetch("config", "PUT", c);
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
    async deleteGroupSchedule(groupId) {
      return this._fetch(`scheduledClasses/group/${groupId}`, "DELETE");
    }
    async getPrevalidation() {
      return this._fetch("prevalidation");
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
            this._trigger("scores_updated", msg);
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

  // Web/src/calendar_colors.ts
  var SUBJECT_PALETTE = [
    "#4f46e5",
    // Indigo
    "#0284c7",
    // Sky Blue
    "#059669",
    // Emerald
    "#d97706",
    // Amber
    "#dc2626",
    // Red
    "#7c3aed",
    // Purple
    "#db2777",
    // Pink
    "#2563eb",
    // Blue
    "#0d9488",
    // Teal
    "#ca8a04",
    // Yellow
    "#ea580c",
    // Orange
    "#e11d48",
    // Rose
    "#9333ea",
    // Violet
    "#16a34a"
    // Green
  ];
  function getSubjectColor(subjectId) {
    if (!subjectId) return "#4f46e5";
    let hash = 0;
    for (let i = 0; i < subjectId.length; i++) {
      hash = subjectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % SUBJECT_PALETTE.length;
    return SUBJECT_PALETTE[index];
  }
  function toggleColorMode(onModeChanged) {
    if (!AppData.colorMode) AppData.colorMode = "teacher";
    AppData.colorMode = AppData.colorMode === "teacher" ? "subject" : "teacher";
    const buttonText = document.getElementById("btn-color-mode-text");
    if (buttonText) {
      buttonText.textContent = AppData.colorMode === "teacher" ? "Color: Profesor" : "Color: Asignatura";
    }
    const buttonIcon = document.getElementById("btn-color-mode-icon");
    if (buttonIcon) {
      buttonIcon.textContent = AppData.colorMode === "teacher" ? "\u{1F3A8}" : "\u{1F4DA}";
    }
    if (typeof onModeChanged === "function") {
      onModeChanged();
    }
  }

  // Web/src/calendar_events.ts
  function parseTimeToMinutes(timeString) {
    if (!timeString || typeof timeString !== "string") return 0;
    const cleanTime = timeString.trim();
    if (!cleanTime.includes(":")) return 0;
    const parts = cleanTime.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0 || minutes >= 60) return 0;
    return hours * 60 + minutes;
  }
  function overlapsRecess(start, end, recessConfig) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;
    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
    let recessStartMinutes = 12 * 60;
    let recessDurationMinutes = 30;
    if (recessConfig) {
      if (typeof recessConfig.start === "string") {
        recessStartMinutes = parseTimeToMinutes(recessConfig.start);
      }
      if (typeof recessConfig.duration === "number" && recessConfig.duration > 0) {
        recessDurationMinutes = recessConfig.duration;
      }
    } else if (AppData.config) {
      recessStartMinutes = parseTimeToMinutes(AppData.config.horaInicioRecreo);
      recessDurationMinutes = AppData.config.duracionRecreo;
    }
    const recessEndMinutes = recessStartMinutes + recessDurationMinutes;
    return startMinutes < recessEndMinutes && endMinutes > recessStartMinutes;
  }
  function getMergedCalendarEvents(classes, type, entityId, colorMode = "teacher", options = {}) {
    const {
      maxBlockDuration = 2,
      recessConfig = AppData.config ? { start: AppData.config.horaInicioRecreo, duration: AppData.config.duracionRecreo } : { start: "12:00", duration: 30 }
    } = options;
    if (!Array.isArray(classes) || classes.length === 0) {
      return [];
    }
    const filtered = classes.filter((cls) => {
      if (type === "teacher") return cls.teacherId === entityId;
      if (type === "group") return cls.groupId === entityId;
      return false;
    });
    const groupsMap = /* @__PURE__ */ new Map();
    filtered.forEach((cls) => {
      const d = new Date(cls.start);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const key = `${dateKey}_${cls.subjectId}_${cls.teacherId}_${cls.groupId}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key).push(cls);
    });
    const displayEvents = [];
    groupsMap.forEach((groupClasses) => {
      groupClasses.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      let index = 0;
      while (index < groupClasses.length) {
        const current = groupClasses[index];
        let mergedIds = [current.id];
        let blockStart = current.start;
        let blockEnd = current.end;
        let blockDuration = current.duration || (new Date(current.end).getTime() - new Date(current.start).getTime()) / 36e5;
        let isPinned = Boolean(current.isPinned);
        let nextIndex = index + 1;
        while (nextIndex < groupClasses.length) {
          const next = groupClasses[nextIndex];
          const currentEndTime = new Date(blockEnd).getTime();
          const nextStartTime = new Date(next.start).getTime();
          const isContiguous = Math.abs(currentEndTime - nextStartTime) < 6e4;
          const nextDuration = next.duration || (new Date(next.end).getTime() - new Date(next.start).getTime()) / 36e5;
          const crossesRecess = overlapsRecess(new Date(blockStart), new Date(next.end), recessConfig);
          if (isContiguous && !crossesRecess && blockDuration + nextDuration <= maxBlockDuration + 0.01) {
            blockEnd = next.end;
            blockDuration += nextDuration;
            mergedIds.push(next.id);
            if (next.isPinned) {
              isPinned = true;
            }
            nextIndex++;
          } else {
            break;
          }
        }
        const subject = AppData.subjects.find((s) => s.id === current.subjectId);
        const teacher = AppData.teachers.find((t) => t.id === current.teacherId);
        const course = AppData.courses.find((c) => c.groups.some((g) => g.id === current.groupId));
        const group = course ? course.groups.find((g) => g.id === current.groupId) : null;
        const pin = isPinned ? "\u{1F4CC} " : "";
        const subjectTitle = subject ? `${pin}${subject.name}` : `${pin}Clase API`;
        const subtitle = type === "group" ? teacher ? `Prof: ${teacher.name}` : "" : course && group ? `${course.name} - G.${group.name}` : teacher ? `Prof: ${teacher.name}` : "";
        const eventBgColor = colorMode === "subject" ? getSubjectColor(current.subjectId) : teacher ? teacher.color : "#4f46e5";
        displayEvents.push({
          id: current.id,
          mergedIds: [...mergedIds],
          calendarId: current.teacherId,
          title: subjectTitle,
          body: subtitle,
          start: blockStart,
          end: blockEnd,
          duration: Math.round(blockDuration * 100) / 100,
          isReadOnly: isPinned,
          isPinned,
          backgroundColor: eventBgColor,
          color: "#ffffff",
          customStyle: { borderRadius: "6px", border: "none", padding: "2px" },
          raw: {
            subjectId: current.subjectId,
            teacherId: current.teacherId,
            groupId: current.groupId
          }
        });
        index = nextIndex;
      }
    });
    return displayEvents;
  }
  function addRecessEvents() {
    if (!AppData.calendarInstance) return;
    const today = /* @__PURE__ */ new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    let startHour = 12;
    let startMin = 0;
    let duration = 30;
    if (AppData.config) {
      const parts = AppData.config.horaInicioRecreo.split(":");
      startHour = parseInt(parts[0], 10) || 12;
      startMin = parseInt(parts[1], 10) || 0;
      duration = AppData.config.duracionRecreo || 30;
    }
    for (let i = 0; i < 5; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const start = new Date(day);
      start.setHours(startHour, startMin, 0, 0);
      const end = new Date(start);
      end.setMinutes(start.getMinutes() + duration);
      AppData.calendarInstance.createEvents([{
        id: `recess-${i}`,
        calendarId: "recess",
        title: "\u2615 Recreo",
        start: start.toISOString(),
        end: end.toISOString(),
        isReadOnly: true,
        isAllDay: false,
        backgroundColor: "#f1f5f9",
        borderColor: "#94a3b8",
        color: "#64748b"
      }]);
    }
  }

  // Web/src/calendar_modal.ts
  function updateModalTeacherOptions(preferredTeacherId = null) {
    const teacherSelect = document.getElementById("modal-teacher");
    const subjSelect = document.getElementById("modal-subject");
    const groupSelect = document.getElementById("modal-group");
    const courseSelect = document.getElementById("modal-course");
    const typeSelect = document.getElementById("view-type-select");
    const viewEntitySelect = document.getElementById("view-entity-select");
    if (!teacherSelect || !subjSelect || !groupSelect) return;
    const currentTeacherVal = preferredTeacherId || teacherSelect.value;
    const subjId = subjSelect.value;
    const groupId = groupSelect.value;
    const courseId = courseSelect?.value;
    const viewType = typeSelect?.value;
    const viewEntity = viewEntitySelect?.value;
    if (viewType === "teacher" && viewEntity) {
      teacherSelect.innerHTML = AppData.teachers.map((t) => {
        return `<option value="${t.id}" ${t.id === viewEntity ? "selected" : ""}>${t.name}</option>`;
      }).join("");
      teacherSelect.value = viewEntity;
      teacherSelect.disabled = true;
      return;
    }
    let assignedTeacherId = "";
    const course = AppData.courses.find((c) => c.id === courseId || c.groups.some((g) => g.id === groupId));
    const group = course?.groups.find((g) => g.id === groupId);
    if (group && group.assignments && group.assignments[subjId]) {
      assignedTeacherId = group.assignments[subjId];
    }
    const qualifiedTeachers = AppData.teachers.filter((t) => t.subjects.includes(subjId));
    let selectedTeacherId = "";
    if (assignedTeacherId && AppData.teachers.some((t) => t.id === assignedTeacherId)) {
      selectedTeacherId = assignedTeacherId;
    } else if (currentTeacherVal && AppData.teachers.some((t) => t.id === currentTeacherVal) && qualifiedTeachers.some((t) => t.id === currentTeacherVal)) {
      selectedTeacherId = currentTeacherVal;
    } else if (qualifiedTeachers.length > 0) {
      selectedTeacherId = qualifiedTeachers[0].id;
    } else if (group?.tutor) {
      const tutorTeacher = AppData.teachers.find((t) => t.name === group.tutor);
      selectedTeacherId = tutorTeacher ? tutorTeacher.id : AppData.teachers[0]?.id || "";
    } else {
      selectedTeacherId = currentTeacherVal || (AppData.teachers[0]?.id || "");
    }
    const sortedTeachers = [...AppData.teachers].sort((a, b) => {
      const aAssigned = a.id === assignedTeacherId ? 1 : 0;
      const bAssigned = b.id === assignedTeacherId ? 1 : 0;
      if (aAssigned !== bAssigned) return bAssigned - aAssigned;
      const aQual = a.subjects.includes(subjId) ? 1 : 0;
      const bQual = b.subjects.includes(subjId) ? 1 : 0;
      if (aQual !== bQual) return bQual - aQual;
      return a.name.localeCompare(b.name);
    });
    teacherSelect.innerHTML = sortedTeachers.map((t) => {
      let tag = "";
      if (t.id === assignedTeacherId) {
        tag = " \u2B50 (Asignado en Reparto)";
      } else if (t.subjects.includes(subjId)) {
        tag = " \u2713 (Especialista)";
      }
      return `<option value="${t.id}" ${t.id === selectedTeacherId ? "selected" : ""}>${t.name}${tag}</option>`;
    }).join("");
    if (selectedTeacherId) {
      teacherSelect.value = selectedTeacherId;
    }
  }
  function onModalSubjectChange() {
    const typeSelect = document.getElementById("view-type-select");
    const viewType = typeSelect?.value;
    const subjSelect = document.getElementById("modal-subject");
    const courseSelect = document.getElementById("modal-course");
    const groupSelect = document.getElementById("modal-group");
    const teacherSelect = document.getElementById("modal-teacher");
    if (!subjSelect) return;
    const subjId = subjSelect.value;
    if (viewType === "teacher") {
      const teacherId = teacherSelect?.value;
      let foundCourse;
      let foundGroup;
      for (const c of AppData.courses) {
        for (const g of c.groups) {
          if (g.assignments && g.assignments[subjId] === teacherId) {
            foundCourse = c;
            foundGroup = g;
            break;
          }
        }
        if (foundCourse) break;
      }
      if (foundCourse && foundGroup) {
        if (courseSelect) {
          courseSelect.value = foundCourse.id;
          onModalCourseChange(foundGroup.id);
        }
      } else {
        const subjectObj = AppData.subjects.find((s) => s.id === subjId);
        const courseBySubj = AppData.courses.find((c) => c.id === subjectObj?.courseId || c.subjects.includes(subjId));
        if (courseBySubj && courseSelect) {
          courseSelect.value = courseBySubj.id;
          onModalCourseChange();
        }
      }
    } else {
      updateModalTeacherOptions();
    }
  }
  function onModalCourseChange(targetGroupId = null) {
    const courseSelect = document.getElementById("modal-course");
    const groupSelect = document.getElementById("modal-group");
    if (!courseSelect || !groupSelect) return;
    const courseId = courseSelect.value;
    const course = AppData.courses.find((c) => c.id === courseId);
    if (course) {
      groupSelect.innerHTML = course.groups.map((g) => `<option value="${g.id}">Grupo ${g.name}</option>`).join("");
      if (targetGroupId && course.groups.some((g) => g.id === targetGroupId)) {
        groupSelect.value = targetGroupId;
      }
    } else {
      groupSelect.innerHTML = "";
    }
    updateModalTeacherOptions();
  }
  function onModalGroupChange() {
    updateModalTeacherOptions();
  }
  function openAddClassModal(start, end) {
    const subjSelect = document.getElementById("modal-subject");
    const teacherSelect = document.getElementById("modal-teacher");
    const groupSelect = document.getElementById("modal-group");
    const courseSelect = document.getElementById("modal-course");
    const daySelect = document.getElementById("modal-day");
    const startTimeInput = document.getElementById("modal-start-time");
    const endTimeInput = document.getElementById("modal-end-time");
    const typeSelect = document.getElementById("view-type-select");
    const viewEntitySelect = document.getElementById("view-entity-select");
    const headerCourseSelect = document.getElementById("header-course-select");
    const viewType = typeSelect ? typeSelect.value : "group";
    const viewEntity = viewEntitySelect ? viewEntitySelect.value : "";
    if (courseSelect) {
      courseSelect.innerHTML = AppData.courses.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    }
    let defaultCourseId = headerCourseSelect ? headerCourseSelect.value : AppData.courses[0]?.id || "";
    let defaultGroupId = "";
    if (viewType === "group" && viewEntity) {
      defaultGroupId = viewEntity;
      const currentCourse = AppData.courses.find((c) => c.groups.some((g) => g.id === defaultGroupId));
      if (currentCourse) defaultCourseId = currentCourse.id;
    } else if (viewType === "teacher" && viewEntity) {
      const teacherObj = AppData.teachers.find((t) => t.id === viewEntity);
      if (teacherObj) {
        for (const c of AppData.courses) {
          for (const g of c.groups) {
            if (g.assignments && Object.values(g.assignments).includes(teacherObj.id)) {
              defaultCourseId = c.id;
              defaultGroupId = g.id;
              break;
            }
          }
        }
      }
    }
    if (courseSelect) {
      courseSelect.value = defaultCourseId;
      courseSelect.disabled = viewType === "group";
    }
    onModalCourseChange(defaultGroupId);
    if (groupSelect) {
      groupSelect.disabled = viewType === "group";
    }
    let availableSubjects = AppData.subjects;
    if (viewType === "teacher" && viewEntity) {
      const teacherObj = AppData.teachers.find((t) => t.id === viewEntity);
      if (teacherObj && teacherObj.subjects && teacherObj.subjects.length > 0) {
        availableSubjects = AppData.subjects.filter((s) => teacherObj.subjects.includes(s.id));
        if (availableSubjects.length === 0) availableSubjects = AppData.subjects;
      }
    } else if (defaultCourseId) {
      const selectedCourse = AppData.courses.find((c) => c.id === defaultCourseId);
      if (selectedCourse && selectedCourse.subjects && selectedCourse.subjects.length > 0) {
        availableSubjects = AppData.subjects.filter((s) => selectedCourse.subjects.includes(s.id));
        if (availableSubjects.length === 0) availableSubjects = AppData.subjects;
      }
    }
    if (subjSelect) {
      subjSelect.innerHTML = availableSubjects.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
    }
    updateModalTeacherOptions();
    if (daySelect && start) {
      const dayMap = { 1: "1", 2: "2", 3: "3", 4: "4", 5: "5" };
      const day = start.getDay();
      if (dayMap[day]) daySelect.value = dayMap[day];
    }
    if (startTimeInput && start) {
      startTimeInput.value = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
    } else if (startTimeInput) {
      startTimeInput.value = "09:00";
    }
    if (endTimeInput && end) {
      endTimeInput.value = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
    } else if (endTimeInput) {
      endTimeInput.value = "10:00";
    }
    const modal = document.getElementById("add-class-modal");
    if (modal) modal.classList.replace("hidden", "flex");
  }
  function closeAddClassModal() {
    const modal = document.getElementById("add-class-modal");
    if (modal) modal.classList.replace("flex", "hidden");
  }
  async function saveNewClass(onSavedCallback) {
    const subjSelect = document.getElementById("modal-subject");
    const teacherSelect = document.getElementById("modal-teacher");
    const groupSelect = document.getElementById("modal-group");
    const daySelect = document.getElementById("modal-day");
    const startTimeInput = document.getElementById("modal-start-time");
    const endTimeInput = document.getElementById("modal-end-time");
    if (!subjSelect || !teacherSelect || !groupSelect || !daySelect || !startTimeInput || !endTimeInput) return;
    const subjectId = subjSelect.value;
    const teacherId = teacherSelect.value;
    const groupId = groupSelect.value;
    const dayIndex = parseInt(daySelect.value, 10);
    const startStr = startTimeInput.value;
    const endStr = endTimeInput.value;
    if (!subjectId || !teacherId || !groupId) {
      showToast("Error de Validaci\xF3n", "Por favor completa todos los campos requeridos.", "warning");
      return;
    }
    const [sH, sM] = startStr.split(":").map(Number);
    const [eH, eM] = endStr.split(":").map(Number);
    const startTotalMins = sH * 60 + sM;
    const endTotalMins = eH * 60 + eM;
    if (endTotalMins <= startTotalMins) {
      showToast("Error de Validaci\xF3n", "La hora de fin debe ser posterior a la de inicio.", "warning");
      return;
    }
    const durationHours = (endTotalMins - startTotalMins) / 60;
    const numSlots = Math.round(durationHours / 0.5);
    const now = /* @__PURE__ */ new Date();
    const currentDay = now.getDay();
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const classDate = new Date(monday);
    classDate.setDate(monday.getDate() + (dayIndex - 1));
    const startDate = new Date(classDate);
    startDate.setHours(sH, sM, 0, 0);
    const endDate = new Date(classDate);
    endDate.setHours(eH, eM, 0, 0);
    if (overlapsRecess(startDate, endDate)) {
      showToast("Error", "No se puede programar una clase durante el recreo (12:00 - 12:30).", "error");
      return;
    }
    for (let i = 0; i < numSlots; i++) {
      const slotStart = new Date(startDate.getTime() + i * 30 * 6e4);
      const slotEnd = new Date(slotStart.getTime() + 30 * 6e4);
      const nuevaClase = {
        id: `class-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
        subjectId,
        teacherId,
        groupId,
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        duration: 0.5,
        isPinned: false
      };
      await AppData.API.saveClass(nuevaClase);
      AppData.scheduledClasses.push(nuevaClase);
      AppData.WS.sendCommand("MANUAL_EDIT", { id: nuevaClase.id });
    }
    closeAddClassModal();
    if (typeof onSavedCallback === "function") {
      onSavedCallback();
    }
    const assignedTeacher = AppData.teachers.find((t) => t.id === teacherId);
    showToast("Clase Guardada", `Programada correctamente para el profesor ${assignedTeacher ? assignedTeacher.name : ""}`, "success");
  }
  function openEventDetail(event, onActionCallback) {
    let mergedEvent = AppData.currentMergedEvents?.find((e) => e.id === event.id || e.mergedIds && e.mergedIds.includes(event.id));
    let constituentClasses = [];
    if (mergedEvent && mergedEvent.mergedIds) {
      constituentClasses = AppData.scheduledClasses.filter((c) => mergedEvent.mergedIds.includes(c.id));
    } else {
      const singleCls = AppData.scheduledClasses.find((c) => c.id === event.id);
      if (singleCls) constituentClasses = [singleCls];
    }
    if (constituentClasses.length === 0) return;
    const firstCls = constituentClasses[0];
    const subject = AppData.subjects.find((s) => s.id === firstCls.subjectId);
    const teacher = AppData.teachers.find((t) => t.id === firstCls.teacherId);
    if (!subject || !teacher) return;
    const totalDuration = constituentClasses.reduce((sum, c) => sum + (c.duration || 0.5), 0);
    const isAnyPinned = constituentClasses.some((c) => c.isPinned);
    const course = AppData.courses.find((c) => c.groups.some((g) => g.id === firstCls.groupId));
    const group = course ? course.groups.find((g) => g.id === firstCls.groupId) : null;
    const courseGroupName = course && group ? `${course.name} - Grupo ${group.name}` : "Sin grupo";
    const titleEl = document.getElementById("event-detail-title");
    if (titleEl) titleEl.textContent = `${subject.name} (${formatHours(totalDuration)}h)`;
    const colorMode = AppData.colorMode || "teacher";
    const headerColor = colorMode === "subject" ? getSubjectColor(firstCls.subjectId) : teacher.color;
    const headerEl = document.getElementById("event-detail-header");
    if (headerEl) headerEl.style.backgroundColor = headerColor;
    const bodyEl = document.getElementById("event-detail-body");
    if (bodyEl) {
      const sTime = new Date(mergedEvent ? mergedEvent.start : firstCls.start).toTimeString().slice(0, 5);
      const eTime = new Date(mergedEvent ? mergedEvent.end : constituentClasses[constituentClasses.length - 1].end).toTimeString().slice(0, 5);
      bodyEl.innerHTML = `
            <p class="text-sm mb-1.5">Curso/Grupo: <b>${courseGroupName}</b></p>
            <p class="text-sm mb-1.5">Impartida por: <b>${teacher.name}</b></p>
            <p class="text-xs text-gray-500">Horario: <b>${sTime} - ${eTime}</b> (${formatHours(totalDuration)}h)</p>
        `;
    }
    const pinBtn = document.getElementById("btn-pin-event");
    if (pinBtn) {
      pinBtn.innerText = isAnyPinned ? "Desfijar" : "Fijar (Pin)";
      pinBtn.onclick = async () => {
        const newPinState = !isAnyPinned;
        for (const cls of constituentClasses) {
          cls.isPinned = newPinState;
          try {
            await AppData.API.updateClass(cls);
          } catch (err) {
            console.error("Error al actualizar estado del pin:", err);
          }
          AppData.WS.sendCommand("PIN_UPDATE", { id: cls.id, state: cls.isPinned });
        }
        closeEventDetail();
        if (typeof onActionCallback === "function") onActionCallback();
      };
    }
    const delBtn = document.getElementById("btn-delete-event");
    if (delBtn) {
      delBtn.onclick = async () => {
        for (const cls of constituentClasses) {
          await AppData.API.deleteClass(cls.id);
          AppData.scheduledClasses = AppData.scheduledClasses.filter((c) => c.id !== cls.id);
          AppData.WS.sendCommand("MANUAL_EDIT", { delete: cls.id });
        }
        closeEventDetail();
        if (typeof onActionCallback === "function") onActionCallback();
      };
    }
    const modal = document.getElementById("event-detail-modal");
    if (modal) {
      modal.classList.replace("hidden", "flex");
      modal.onclick = (e) => {
        if (e.target === modal) {
          closeEventDetail();
        }
      };
    }
  }
  function closeEventDetail() {
    const modal = document.getElementById("event-detail-modal");
    if (modal) modal.classList.replace("flex", "hidden");
  }

  // Web/src/calendar.ts
  function toggleColorMode2() {
    toggleColorMode(() => refreshCalendarView());
  }
  function saveNewClass2() {
    return saveNewClass(() => refreshCalendarView());
  }
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
    const course = AppData.courses.find((c) => c.id === courseId);
    if (course) {
      if (course.groups.length === 0) {
        select.innerHTML = `<option value="">Sin grupos</option>`;
      } else {
        select.innerHTML = course.groups.map((g) => `<option value="${g.id}">Grupo ${g.name}</option>`).join("");
      }
    } else {
      select.innerHTML = "";
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
      week: {
        taskView: false,
        eventView: ["time"],
        dayNames: ["Dom", "Lunes", "Martes", "Mi\xE9rcoles", "Jueves", "Viernes", "S\xE1b"],
        workweek: true,
        hourStart: 8,
        hourEnd: 15
      },
      calendars: [
        { id: "default", name: "Clases", backgroundColor: "#4f46e5" },
        { id: "pinned", name: "Fijadas", backgroundColor: "#059669" },
        { id: "recess", name: "Recreo", backgroundColor: "#f1f5f9", borderColor: "#94a3b8", color: "#64748b" }
      ],
      template: {
        weekDayName(model) {
          return `<span class="toastui-calendar-day-name-item">${model.dayName}</span>`;
        },
        time(event) {
          if (event.calendarId === "recess") {
            return `<div class="p-1 font-semibold text-slate-500 text-xs">\u2615 Recreo</div>`;
          }
          return `
                    <div class="p-1 flex flex-col justify-center h-full overflow-hidden text-white leading-tight">
                        <div class="font-bold text-xs truncate">${event.title}</div>
                        ${event.body ? `<div class="text-[11px] font-medium opacity-90 truncate mt-0.5">${event.body}</div>` : ""}
                    </div>
                `;
        }
      }
    });
    addRecessEvents();
    AppData.calendarInstance.on("selectDateTime", function(info) {
      AppData.calendarInstance.clearGridSelections();
      const startObj = typeof info.start.toDate === "function" ? info.start.toDate() : new Date(info.start);
      const endObj = typeof info.end.toDate === "function" ? info.end.toDate() : new Date(info.end);
      openAddClassModal(startObj, endObj);
    });
    AppData.calendarInstance.on("beforeUpdateEvent", async function(info) {
      const { event, changes } = info;
      const mergedEvent = AppData.currentMergedEvents?.find((e) => e.id === event.id || e.mergedIds && e.mergedIds.includes(event.id));
      let constituentClasses = [];
      if (mergedEvent && mergedEvent.mergedIds) {
        constituentClasses = AppData.scheduledClasses.filter((c) => mergedEvent.mergedIds.includes(c.id));
      } else {
        const singleCls = AppData.scheduledClasses.find((c) => c.id === event.id);
        if (singleCls) constituentClasses = [singleCls];
      }
      if (constituentClasses.length === 0) return;
      if (constituentClasses.some((c) => c.isPinned)) {
        showToast("Bloqueado", "No puedes mover ni alterar una clase que est\xE1 fijada (Pin).", "warning");
        return;
      }
      let startCandidate = mergedEvent ? mergedEvent.start : constituentClasses[0].start;
      let endCandidate = mergedEvent ? mergedEvent.end : constituentClasses[constituentClasses.length - 1].end;
      if (changes.start) startCandidate = typeof changes.start.toDate === "function" ? changes.start.toDate() : new Date(changes.start);
      if (changes.end) endCandidate = typeof changes.end.toDate === "function" ? changes.end.toDate() : new Date(changes.end);
      if (overlapsRecess(new Date(startCandidate), new Date(endCandidate))) {
        showToast("Error", "No se puede programar una clase durante el recreo (12:00 - 12:30).", "error");
        refreshCalendarView();
        return;
      }
      showToast("Sincronizando...", "Guardando nueva posici\xF3n en el servidor...", "info");
      constituentClasses.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      let currentSlotStart = new Date(startCandidate);
      for (const cls of constituentClasses) {
        const slotDurationHours = cls.duration || 0.5;
        const slotDurationMs = slotDurationHours * 36e5;
        const slotEnd = new Date(currentSlotStart.getTime() + slotDurationMs);
        cls.start = currentSlotStart.toISOString();
        cls.end = slotEnd.toISOString();
        cls.duration = slotDurationHours;
        await AppData.API.updateClass(cls);
        AppData.WS.sendCommand("MANUAL_EDIT", { id: cls.id, action: "moved" });
        currentSlotStart = slotEnd;
      }
      refreshCalendarView();
    });
    AppData.calendarInstance.on("clickEvent", (e) => openEventDetail(e.event, () => refreshCalendarView()));
  }
  function refreshCalendarView() {
    const typeSelect = document.getElementById("view-type-select");
    const entitySelect = document.getElementById("view-entity-select");
    if (!typeSelect || !entitySelect) return;
    const type = typeSelect.value;
    const entityId = entitySelect.value;
    if (AppData.calendarInstance) {
      AppData.calendarInstance.clear();
      addRecessEvents();
    }
    if (!entityId) return;
    const colorMode = AppData.colorMode || "teacher";
    const mergedEvents = getMergedCalendarEvents(AppData.scheduledClasses, type, entityId, colorMode);
    AppData.currentMergedEvents = mergedEvents;
    if (AppData.calendarInstance) AppData.calendarInstance.createEvents(mergedEvents);
    renderTeacherSummaryCard(type, entityId);
  }
  function renderTeacherSummaryCard(type, entityId) {
    const summaryCard = document.getElementById("teacher-summary-card");
    const summaryContent = document.getElementById("teacher-summary-content");
    if (type === "teacher" && entityId) {
      const teacher = AppData.teachers.find((t) => t.id === entityId);
      if (teacher && summaryCard && summaryContent) {
        const teacherClasses = AppData.scheduledClasses.filter((c) => c.teacherId === entityId);
        const totalHours = teacherClasses.reduce((sum, c) => sum + c.duration, 0);
        const map = /* @__PURE__ */ new Map();
        teacherClasses.forEach((cls) => {
          const subject = AppData.subjects.find((s) => s.id === cls.subjectId);
          const course = AppData.courses.find((c) => c.groups.some((g) => g.id === cls.groupId));
          const group = course ? course.groups.find((g) => g.id === cls.groupId) : null;
          const cName = course ? course.name : "Curso";
          const gName = group ? group.name : "Grupo";
          const sName = subject ? subject.name : "Asignatura";
          const key = `${cName}_${gName}_${sName}`;
          if (!map.has(key)) {
            map.set(key, { courseName: cName, groupName: gName, subjectName: sName, hours: 0 });
          }
          map.get(key).hours += cls.duration;
        });
        const maxHours = teacher.maxHours || (AppData.config ? Math.round(AppData.config.minutosMaximosProfesor / 60) : 25);
        const items = Array.from(map.values());
        let summaryHtml = `
                <div class="flex flex-wrap items-center justify-between gap-4 mb-3 border-b border-gray-100 pb-2">
                    <div class="flex items-center gap-2">
                        <span class="w-3.5 h-3.5 rounded-full shadow-sm" style="background-color: ${teacher.color};"></span>
                        <h4 class="font-bold text-gray-800 text-sm">Resumen Docente: ${teacher.name}</h4>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500 font-medium">Carga Lectiva Asignada:</span>
                        <span class="text-xs font-bold px-2.5 py-1 ${totalHours <= maxHours ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"} rounded-full">
                            ${totalHours.toFixed(1)}h / ${maxHours}h max
                        </span>
                    </div>
                </div>
            `;
        if (items.length === 0) {
          summaryHtml += `<p class="text-xs text-gray-400 italic">No tiene clases asignadas en el horario actual.</p>`;
        } else {
          summaryHtml += `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">` + items.map((item) => `
                        <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between hover:bg-slate-100 transition-colors">
                            <span class="text-xs font-bold text-slate-800 truncate">${item.courseName} - G.${item.groupName}</span>
                            <div class="flex justify-between items-center mt-1 text-[11px]">
                                <span class="text-indigo-600 font-semibold truncate">${item.subjectName}</span>
                                <span class="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">${item.hours.toFixed(1)}h</span>
                            </div>
                        </div>
                    `).join("") + `</div>`;
        }
        summaryContent.innerHTML = summaryHtml;
        summaryCard.classList.remove("hidden");
      }
    } else {
      if (summaryCard) summaryCard.classList.add("hidden");
    }
  }
  async function clearGroupSchedule() {
    const typeSelect = document.getElementById("view-type-select");
    const entitySelect = document.getElementById("view-entity-select");
    if (!typeSelect || !entitySelect) return;
    if (typeSelect.value !== "group") {
      showToast("Info", "Por favor, selecciona la vista de 'Grupo' para vaciar un horario espec\xEDfico.", "info");
      return;
    }
    const groupId = entitySelect.value;
    if (!groupId) {
      showToast("Info", "No hay ning\xFAn grupo seleccionado.", "info");
      return;
    }
    const groupObj = AppData.courses.flatMap((c) => c.groups).find((g) => g.id === groupId);
    const groupName = groupObj ? groupObj.name : "este grupo";
    if (!confirm(`\xBFEst\xE1s seguro de que deseas vaciar todas las clases programadas para el grupo "${groupName}"?`)) {
      return;
    }
    try {
      showToast("Limpiando...", "Eliminando clases de la base de datos...", "info");
      await AppData.API.deleteGroupSchedule(groupId);
      AppData.scheduledClasses = AppData.scheduledClasses.filter((c) => c.groupId !== groupId);
      refreshCalendarView();
      showToast("\xC9xito", "El horario del grupo se ha vaciado.", "success");
      AppData.WS.sendCommand("MANUAL_EDIT", { action: "cleared", groupId });
    } catch (err) {
      console.error("Error clearing schedule:", err);
      showToast("Error", "No se pudo limpiar el horario.", "error");
    }
  }

  // Web/src/crud_subjects.ts
  function openSubjectForm(id = null) {
    const titleEl = document.getElementById("crud-modal-title");
    const bodyEl = document.getElementById("crud-modal-body");
    if (!titleEl || !bodyEl) return;
    titleEl.textContent = id ? "Editar Asignatura" : "Nueva Asignatura";
    const s = id ? AppData.subjects.find((x) => x.id === id) : null;
    const currentCourseId = AppData.currentCourseId;
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
                <select id="crud-subject-course" disabled required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none bg-gray-100 cursor-not-allowed">
                    ${AppData.courses.map((c) => `<option value="${c.id}" ${c.id === (s?.courseId || currentCourseId) ? "selected" : ""}>${c.name}</option>`).join("")}
                </select>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Profesores Cualificados (Especialistas)</label>
                <div class="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                    ${AppData.teachers.map((t) => {
      const isChecked = s?.teachers?.includes(t.id) || false;
      return `
                            <label class="flex items-center gap-2 cursor-pointer text-sm">
                                <input type="checkbox" name="crud-subject-teachers" value="${t.id}" ${isChecked ? "checked" : ""} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                <span>${t.name}</span>
                            </label>
                        `;
    }).join("")}
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow animate-fade-in">Guardar</button>
            </div>
        </form>
    `;
    const modal = document.getElementById("crud-modal");
    if (modal) modal.classList.replace("hidden", "flex");
    const form = document.getElementById("form-crud");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById("crud-subject-name").value;
        const hours = parseFloat(document.getElementById("crud-subject-hours").value);
        const courseId = AppData.currentCourseId;
        const checkboxes = document.querySelectorAll('input[name="crud-subject-teachers"]:checked');
        const teachers = Array.from(checkboxes).map((cb) => cb.value);
        try {
          await AppData.API.saveSubject({ id: id || void 0, name, hours, courseId, teachers });
          showToast("\xC9xito", "Asignatura guardada correctamente", "success");
          closeCrudModal();
          renderSubjects();
        } catch (err) {
          showToast("Error", "No se pudo guardar la asignatura", "error");
        }
      };
    }
  }
  function closeCrudModal() {
    const modal = document.getElementById("crud-modal");
    if (modal) modal.classList.replace("flex", "hidden");
  }
  function openCourseSubjects(courseId) {
    AppData.currentCourseId = courseId;
    window.switchTab("subjects");
  }
  function filterSubjectsByCourse(subjects, courseId) {
    if (!courseId || !Array.isArray(subjects)) return [];
    return subjects.filter((s) => s.courseId === courseId);
  }
  async function renderSubjects() {
    try {
      AppData.subjects = await AppData.API.getSubjects();
      AppData.courses = await AppData.API.getCourses();
      const courseId = AppData.currentCourseId;
      const titleEl = document.getElementById("view-subjects-title");
      if (titleEl) {
        const course = AppData.courses.find((c) => c.id === courseId);
        titleEl.textContent = course ? `Asignaturas de ${course.name}` : "Gesti\xF3n de Asignaturas";
      }
      const tbody = document.getElementById("table-subjects");
      if (!tbody) return;
      if (!courseId) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">Por favor, selecciona un curso primero.</td></tr>';
        return;
      }
      const filtered = filterSubjectsByCourse(AppData.subjects, courseId);
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">No hay asignaturas en este curso.</td></tr>';
        return;
      }
      tbody.innerHTML = filtered.map((s) => `
            <tr class="hover:bg-gray-50 border-b border-gray-100 text-sm">
                <td class="p-4 font-medium text-gray-800">${s.name}</td>
                <td class="p-4 text-center text-gray-600">${formatHours(s.hours)} h</td>
                <td class="p-4 text-center">
                    <button onclick="openFormModal('subject', '${s.id}')" class="text-indigo-600 hover:text-indigo-900 font-semibold mr-3">Editar</button>
                    <button onclick="deleteSubject('${s.id}')" class="text-red-600 hover:text-red-900 font-semibold">Eliminar</button>
                </td>
            </tr>
        `).join("");
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

  // Web/src/crud_teachers.ts
  function openTeacherForm(id = null) {
    const titleEl = document.getElementById("crud-modal-title");
    const bodyEl = document.getElementById("crud-modal-body");
    if (!titleEl || !bodyEl) return;
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
                <input type="number" id="crud-teacher-max-hours" required min="0.5" step="0.5" class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${t?.maxHours || 22.5}">
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
                <div class="border border-gray-300 rounded-lg p-3 max-h-56 overflow-y-auto space-y-3 bg-gray-50">
                    ${AppData.courses.map((c) => {
      const courseSubjects = AppData.subjects.filter((s) => c.subjects.includes(s.id));
      if (courseSubjects.length === 0) return "";
      return `
                            <div class="space-y-1.5">
                                <div class="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded inline-block">
                                    \u{1F4DA} ${c.name}
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                                    ${courseSubjects.map((s) => `
                                        <label class="flex items-center gap-2 cursor-pointer text-sm hover:bg-white p-1 rounded transition-colors">
                                            <input type="checkbox" name="crud-teacher-subjects" value="${s.id}" ${t?.subjects.includes(s.id) ? "checked" : ""} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                            <span class="truncate font-medium text-gray-700">${s.name} <span class="text-xs text-gray-400 font-normal">(${formatHours(s.hours)}h)</span></span>
                                        </label>
                                    `).join("")}
                                </div>
                            </div>
                        `;
    }).join("")}
                    ${(() => {
      const unassignedSubjects = AppData.subjects.filter((s) => !AppData.courses.some((c) => c.subjects.includes(s.id)));
      if (unassignedSubjects.length === 0) return "";
      return `
                            <div class="space-y-1.5">
                                <div class="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-200 px-2 py-0.5 rounded inline-block">
                                    Otras Asignaturas
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                                    ${unassignedSubjects.map((s) => `
                                        <label class="flex items-center gap-2 cursor-pointer text-sm hover:bg-white p-1 rounded transition-colors">
                                            <input type="checkbox" name="crud-teacher-subjects" value="${s.id}" ${t?.subjects.includes(s.id) ? "checked" : ""} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                            <span class="truncate font-medium text-gray-700">${s.name} <span class="text-xs text-gray-400 font-normal">(${formatHours(s.hours)}h)</span></span>
                                        </label>
                                    `).join("")}
                                </div>
                            </div>
                        `;
    })()}
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
            </div>
        </form>
    `;
    const modal = document.getElementById("crud-modal");
    if (modal) modal.classList.replace("hidden", "flex");
    const form = document.getElementById("form-crud");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById("crud-teacher-name").value;
        const maxHours = parseFloat(document.getElementById("crud-teacher-max-hours").value);
        const color = document.getElementById("crud-teacher-color").value;
        const checkboxes = document.querySelectorAll('input[name="crud-teacher-subjects"]:checked');
        const subjects = Array.from(checkboxes).map((cb) => cb.value);
        try {
          const existing = id ? AppData.teachers.find((x) => x.id === id) : null;
          const availability = existing ? existing.availability : [];
          await AppData.API.saveTeacher({ id: id || void 0, name, maxHours, color, subjects, availability });
          showToast("\xC9xito", "Profesor guardado correctamente", "success");
          closeCrudModal();
          renderTeachers();
        } catch (err) {
          showToast("Error", "No se pudo guardar el profesor", "error");
        }
      };
    }
  }
  function formatTeacherSpecialties(teacher, subjects, courses) {
    if (!teacher || !Array.isArray(teacher.subjects) || teacher.subjects.length === 0) {
      return "";
    }
    return teacher.subjects.map((sId) => {
      const s = subjects.find((x) => x.id === sId);
      if (!s) return "";
      const course = courses.find((c) => c.subjects.includes(sId));
      return course ? `${s.name} (${course.name})` : s.name;
    }).filter((n) => n !== "").join(", ");
  }
  async function renderTeachers() {
    try {
      AppData.teachers = await AppData.API.getTeachers();
      const list = document.getElementById("list-teachers");
      if (!list) return;
      list.innerHTML = AppData.teachers.map((t) => {
        const subjNames = formatTeacherSpecialties(t, AppData.subjects, AppData.courses);
        return `
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
                        <button onclick="openAvailabilityModal('${t.id}')" class="text-emerald-600 hover:text-emerald-800 text-xs font-semibold mr-auto flex items-center gap-1">\u{1F4C5} Disponibilidad</button>
                        <button onclick="openFormModal('teacher', '${t.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-semibold">Editar</button>
                        <button onclick="deleteTeacher('${t.id}')" class="text-red-600 hover:text-red-900 text-xs font-semibold">Eliminar</button>
                    </div>
                </div>
            `;
      }).join("");
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

  // Web/src/crud_courses.ts
  var currentCourseIdForGroup = "";
  var currentGroupIdForGroup = null;
  function openCourseForm(id = null) {
    const titleEl = document.getElementById("crud-modal-title");
    const bodyEl = document.getElementById("crud-modal-body");
    if (!titleEl || !bodyEl) return;
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
    const modal = document.getElementById("crud-modal");
    if (modal) modal.classList.replace("hidden", "flex");
    const form = document.getElementById("form-crud");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById("crud-course-name").value;
        try {
          await AppData.API.saveCourse({ id: id || void 0, name });
          showToast("\xC9xito", "Curso guardado correctamente", "success");
          closeCrudModal();
          renderCourses();
        } catch (err) {
          showToast("Error", "No se pudo guardar el curso", "error");
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
  async function renderCourses() {
    try {
      AppData.courses = await AppData.API.getCourses();
      AppData.teachers = await AppData.API.getTeachers();
      const container = document.getElementById("list-courses");
      if (!container) return;
      container.innerHTML = AppData.courses.map((c) => {
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
        return `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
                    <div class="flex items-center justify-between border-b pb-2">
                        <h3 class="font-bold text-gray-800 text-lg">${c.name}</h3>
                        <div class="flex gap-3">
                            <button onclick="openCourseSubjects('${c.id}')" class="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1">\u{1F4DA} Asignaturas</button>
                            <button onclick="openGroupModal('${c.id}')" class="text-emerald-600 hover:text-emerald-800 text-xs font-bold">+ A\xF1adir Grupo</button>
                            <button onclick="openFormModal('course', '${c.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold">Editar Curso</button>
                            <button onclick="deleteCourse('${c.id}')" class="text-red-600 hover:text-red-900 text-xs font-bold">Eliminar Curso</button>
                        </div>
                    </div>
                    ${groupsHtml}
                </div>
            `;
      }).join("");
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

  // Web/src/crud.ts
  function openFormModal(type, id = null) {
    if (type === "subject") {
      openSubjectForm(id);
    } else if (type === "teacher") {
      openTeacherForm(id);
    } else if (type === "course") {
      openCourseForm(id);
    }
  }

  // Web/src/assignments.ts
  async function renderAssignmentsList() {
    const container = document.getElementById("assignments-list");
    if (!container) return;
    container.innerHTML = "";
    try {
      AppData.courses = await AppData.API.getCourses();
      AppData.subjects = await AppData.API.getSubjects();
      AppData.teachers = await AppData.API.getTeachers();
      if (AppData.courses.length === 0) {
        container.innerHTML = '<div class="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 italic">No hay asignaciones cargadas. Cree cursos y grupos primero.</div>';
        return;
      }
      const validCourses = AppData.courses.filter((c) => c.groups.length > 0);
      if (validCourses.length === 0) {
        container.innerHTML = '<div class="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 italic">No hay grupos creados en los cursos. Cree grupos primero.</div>';
        return;
      }
      container.innerHTML = validCourses.map((c) => {
        const courseSubjects = AppData.subjects.filter((s) => s.courseId === c.id);
        const groupsAssignmentsHtml = c.groups.map((g) => {
          let subjectsListHtml = "";
          if (courseSubjects.length === 0) {
            subjectsListHtml = '<p class="text-xs text-gray-400 italic py-2">No hay asignaturas en este curso.</p>';
          } else {
            subjectsListHtml = courseSubjects.map((s) => {
              const assignedTeacherId = g.assignments[s.id] || "";
              const qualifiedTeachers = AppData.teachers.filter((t) => t.subjects.includes(s.id));
              return `
                            <div class="flex flex-col gap-1.5 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                                <span class="text-sm font-semibold text-gray-700 truncate block" title="${s.name}">${s.name} (${formatHours(s.hours)}h)</span>
                                <select onchange="updateAssignment('${c.id}', '${g.id}', '${s.id}', this.value)" class="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white hover:border-slate-400 focus:border-indigo-500 outline-none transition-colors">
                                    <option value="">-- Sin asignar --</option>
                                    ${AppData.teachers.map((t) => {
                const isQualified = qualifiedTeachers.some((qt) => qt.id === t.id);
                const label = isQualified ? t.name : `${t.name} (No especialista)`;
                return `<option value="${t.id}" ${assignedTeacherId === t.id ? "selected" : ""}>${label}</option>`;
              }).join("")}
                                </select>
                            </div>
                        `;
            }).join("");
          }
          return `
                    <div id="group-card-${c.id}-${g.id}" class="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
                        <div class="flex items-center justify-between border-b pb-2">
                            <h4 class="font-bold text-gray-800 text-sm">Grupo ${g.name}</h4>
                            <button onclick="clearGroupAssignments('${c.id}', '${g.id}')" class="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-0.5" title="Poner todas las asignaturas de este grupo sin asignar">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                Vaciar Grupo
                            </button>
                        </div>
                        <div class="space-y-3">
                            ${subjectsListHtml}
                        </div>
                    </div>
                `;
        }).join("");
        return `
                <div id="course-card-${c.id}" class="mb-8 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <div class="flex items-center justify-between border-b pb-2">
                        <h3 class="font-bold text-gray-800 text-lg">${c.name}</h3>
                        <button onclick="clearCourseAssignments('${c.id}')" class="text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200 transition-colors" title="Poner todas las asignaciones de todos los grupos de este curso sin asignar">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            Vaciar Curso
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${groupsAssignmentsHtml}
                    </div>
                </div>
            `;
      }).join("");
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
  async function clearGroupAssignments(courseId, groupId) {
    try {
      const course = AppData.courses.find((x) => x.id === courseId);
      if (!course) return;
      const group = course.groups.find((g) => g.id === groupId);
      if (!group) return;
      if (!confirm(`\xBFEst\xE1s seguro de que deseas poner todas las asignaturas del grupo "${group.name}" sin asignar?`)) {
        return;
      }
      group.assignments = {};
      await AppData.API.updateCourseGroup(courseId, course.groups);
      const groupCard = document.getElementById(`group-card-${courseId}-${groupId}`);
      if (groupCard) {
        const selects = groupCard.querySelectorAll("select");
        selects.forEach((select) => {
          select.value = "";
        });
      }
      showToast("\xC9xito", "Todas las asignaturas del grupo han sido puestas sin asignar", "success");
    } catch (err) {
      showToast("Error", "No se pudo limpiar las asignaciones del grupo", "error");
    }
  }
  async function clearCourseAssignments(courseId) {
    try {
      const course = AppData.courses.find((x) => x.id === courseId);
      if (!course) return;
      if (!confirm(`\xBFEst\xE1s seguro de que deseas poner todas las asignaturas de TODOS los grupos del curso "${course.name}" sin asignar?`)) {
        return;
      }
      course.groups.forEach((g) => {
        g.assignments = {};
      });
      await AppData.API.updateCourseGroup(courseId, course.groups);
      const courseCard = document.getElementById(`course-card-${courseId}`);
      if (courseCard) {
        const selects = courseCard.querySelectorAll("select");
        selects.forEach((select) => {
          select.value = "";
        });
      }
      showToast("\xC9xito", "Todas las asignaturas del curso han sido puestas sin asignar", "success");
    } catch (err) {
      showToast("Error", "No se pudo limpiar las asignaciones del curso", "error");
    }
  }

  // Web/src/availability.ts
  var currentAvailabilityTeacherId = null;
  var currentTeacherAvailabilityList = [];
  function openAvailabilityModal(teacherId) {
    const t = AppData.teachers.find((x) => x.id === teacherId);
    if (!t) return;
    currentAvailabilityTeacherId = teacherId;
    currentTeacherAvailabilityList = t.availability ? [...t.availability] : [];
    const nameEl = document.getElementById("availability-teacher-name");
    if (nameEl) nameEl.textContent = t.name;
    const tbody = document.getElementById("availability-grid-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    const timeSlots = [
      { start: "09:00", end: "09:30" },
      { start: "09:30", end: "10:00" },
      { start: "10:00", end: "10:30" },
      { start: "10:30", end: "11:00" },
      { start: "11:00", end: "11:30" },
      { start: "11:30", end: "12:00" },
      { start: "12:30", end: "13:00" },
      { start: "13:00", end: "13:30" },
      { start: "13:30", end: "14:00" }
    ];
    tbody.innerHTML = timeSlots.map((slot, index) => {
      let cellsHtml = "";
      for (let day = 1; day <= 5; day++) {
        const isUnavailable = currentTeacherAvailabilityList.some(
          (av) => av.dayOfWeek === day && av.startTime === slot.start && av.endTime === slot.end
        );
        const cellId = `cell-av-${day}-${index}`;
        const bgClass = isUnavailable ? "bg-red-500 hover:bg-red-600 text-white border-red-300 font-bold" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200";
        const textVal = isUnavailable ? "NO DISPONIBLE" : "DISPONIBLE";
        cellsHtml += `
                <td class="p-2 text-center border border-gray-200">
                    <button type="button" id="${cellId}" 
                        onclick="toggleAvailabilitySlot(${day}, '${slot.start}', '${slot.end}', '${cellId}')"
                        class="w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all ${bgClass}">
                        ${textVal}
                    </button>
                </td>
            `;
      }
      return `
            <tr class="hover:bg-gray-50">
                <td class="p-3 border border-gray-200 font-semibold text-gray-700 text-center">${slot.start} - ${slot.end}</td>
                ${cellsHtml}
            </tr>
        `;
    }).join("");
    const modal = document.getElementById("availability-modal");
    if (modal) modal.classList.replace("hidden", "flex");
  }
  function toggleAvailabilitySlot(day, start, end, cellId) {
    const btn = document.getElementById(cellId);
    if (!btn) return;
    const index = currentTeacherAvailabilityList.findIndex(
      (av) => av.dayOfWeek === day && av.startTime === start && av.endTime === end
    );
    if (index > -1) {
      currentTeacherAvailabilityList.splice(index, 1);
      btn.className = "w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200";
      btn.textContent = "DISPONIBLE";
    } else {
      currentTeacherAvailabilityList.push({ dayOfWeek: day, startTime: start, endTime: end });
      btn.className = "w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all bg-red-500 hover:bg-red-600 text-white border border-red-300 font-bold";
      btn.textContent = "NO DISPONIBLE";
    }
  }
  function closeAvailabilityModal() {
    const modal = document.getElementById("availability-modal");
    if (modal) modal.classList.replace("flex", "hidden");
  }
  async function saveAvailability() {
    if (!currentAvailabilityTeacherId) return;
    const t = AppData.teachers.find((x) => x.id === currentAvailabilityTeacherId);
    if (!t) return;
    t.availability = currentTeacherAvailabilityList;
    try {
      await AppData.API.saveTeacher(t);
      showToast("\xC9xito", "Disponibilidad docente guardada correctamente", "success");
      closeAvailabilityModal();
      renderTeachers();
    } catch (err) {
      showToast("Error", "No se pudo guardar la disponibilidad", "error");
    }
  }

  // Web/src/settings.ts
  function loadSettings() {
    const conf = AppData.config;
    if (!conf) return;
    const elMinimo = document.getElementById("settings-tiempo-minimo");
    const elMaximo = document.getElementById("settings-tiempo-maximo");
    const elMaxProfe = document.getElementById("settings-max-minutos-profesor");
    const elPriorizar = document.getElementById("settings-priorizar-tutor");
    const elPriorizarPuntos = document.getElementById("settings-priorizar-tutor-puntos");
    const elBloquesPuntos = document.getElementById("settings-bloques-60-puntos");
    const elMinimizarAsig = document.getElementById("settings-minimizar-asignaturas");
    const elMinimizarAsigPuntos = document.getElementById("settings-minimizar-asignaturas-puntos");
    const elLimiteTiempo = document.getElementById("settings-limite-tiempo");
    const elTiempoEstancamiento = document.getElementById("settings-tiempo-estancamiento");
    const elHoraInicio = document.getElementById("settings-hora-inicio");
    const elHoraFin = document.getElementById("settings-hora-fin");
    const elRecreoInicio = document.getElementById("settings-recreo-inicio");
    const elRecreoDuracion = document.getElementById("settings-recreo-duracion");
    const elRespEspecialidad = document.getElementById("settings-respetar-especialidad");
    const elRespLimiteHoras = document.getElementById("settings-respetar-limite-horas");
    const elRespDisponibilidad = document.getElementById("settings-respetar-disponibilidad");
    if (elMinimo) elMinimo.value = conf.tiempoMinimo.toString();
    if (elMaximo) elMaximo.value = conf.tiempoMaximo.toString();
    if (elMaxProfe) elMaxProfe.value = conf.minutosMaximosProfesor.toString();
    if (elPriorizar) {
      elPriorizar.checked = conf.priorizarTutor;
      const container = document.getElementById("settings-tutor-points-container");
      if (container) {
        container.style.display = conf.priorizarTutor ? "flex" : "none";
      }
      elPriorizar.onchange = () => {
        if (container) container.style.display = elPriorizar.checked ? "flex" : "none";
      };
    }
    if (elPriorizarPuntos) elPriorizarPuntos.value = conf.priorizarTutorPuntos.toString();
    if (elBloquesPuntos) elBloquesPuntos.value = conf.fomentarBloques60Puntos.toString();
    if (elMinimizarAsig) {
      elMinimizarAsig.checked = conf.minimizarAsignaturasDistintas ?? true;
      const container = document.getElementById("settings-minimizar-asignaturas-points-container");
      if (container) {
        container.style.display = elMinimizarAsig.checked ? "flex" : "none";
      }
      elMinimizarAsig.onchange = () => {
        if (container) container.style.display = elMinimizarAsig.checked ? "flex" : "none";
      };
    }
    if (elMinimizarAsigPuntos) elMinimizarAsigPuntos.value = (conf.minimizarAsignaturasPuntos ?? 50).toString();
    if (elLimiteTiempo) elLimiteTiempo.value = (conf.limiteTiempoSegundos ?? 18e3).toString();
    if (elTiempoEstancamiento) elTiempoEstancamiento.value = (conf.tiempoEstancamientoSegundos ?? 60).toString();
    if (elHoraInicio) elHoraInicio.value = conf.horaInicioClases;
    if (elHoraFin) elHoraFin.value = conf.horaFinClases;
    if (elRecreoInicio) elRecreoInicio.value = conf.horaInicioRecreo;
    if (elRecreoDuracion) elRecreoDuracion.value = conf.duracionRecreo.toString();
    if (elRespEspecialidad) elRespEspecialidad.checked = conf.respetarEspecialidad;
    if (elRespLimiteHoras) elRespLimiteHoras.checked = conf.respetarLimiteHoras;
    if (elRespDisponibilidad) elRespDisponibilidad.checked = conf.respetarDisponibilidad;
  }
  async function saveSettings() {
    const elMinimo = document.getElementById("settings-tiempo-minimo");
    const elMaximo = document.getElementById("settings-tiempo-maximo");
    const elMaxProfe = document.getElementById("settings-max-minutos-profesor");
    const elPriorizar = document.getElementById("settings-priorizar-tutor");
    const elPriorizarPuntos = document.getElementById("settings-priorizar-tutor-puntos");
    const elBloquesPuntos = document.getElementById("settings-bloques-60-puntos");
    const elMinimizarAsig = document.getElementById("settings-minimizar-asignaturas");
    const elMinimizarAsigPuntos = document.getElementById("settings-minimizar-asignaturas-puntos");
    const elLimiteTiempo = document.getElementById("settings-limite-tiempo");
    const elTiempoEstancamiento = document.getElementById("settings-tiempo-estancamiento");
    const elHoraInicio = document.getElementById("settings-hora-inicio");
    const elHoraFin = document.getElementById("settings-hora-fin");
    const elRecreoInicio = document.getElementById("settings-recreo-inicio");
    const elRecreoDuracion = document.getElementById("settings-recreo-duracion");
    const elRespEspecialidad = document.getElementById("settings-respetar-especialidad");
    const elRespLimiteHoras = document.getElementById("settings-respetar-limite-horas");
    const elRespDisponibilidad = document.getElementById("settings-respetar-disponibilidad");
    const payload = {
      priorizarTutor: elPriorizar ? elPriorizar.checked : false,
      tiempoMinimo: elMinimo ? parseInt(elMinimo.value) : 30,
      tiempoMaximo: elMaximo ? parseInt(elMaximo.value) : 60,
      minutosMaximosProfesor: elMaxProfe ? parseInt(elMaxProfe.value) : 1500,
      priorizarTutorPuntos: elPriorizarPuntos ? parseInt(elPriorizarPuntos.value) : 100,
      fomentarBloques60Puntos: elBloquesPuntos ? parseInt(elBloquesPuntos.value) : 10,
      minimizarAsignaturasDistintas: elMinimizarAsig ? elMinimizarAsig.checked : true,
      minimizarAsignaturasPuntos: elMinimizarAsigPuntos ? parseInt(elMinimizarAsigPuntos.value) : 50,
      limiteTiempoSegundos: elLimiteTiempo ? parseFloat(elLimiteTiempo.value) : 18e3,
      tiempoEstancamientoSegundos: elTiempoEstancamiento ? parseFloat(elTiempoEstancamiento.value) : 60,
      horaInicioClases: elHoraInicio ? elHoraInicio.value : "09:00",
      horaFinClases: elHoraFin ? elHoraFin.value : "14:00",
      horaInicioRecreo: elRecreoInicio ? elRecreoInicio.value : "12:00",
      duracionRecreo: elRecreoDuracion ? parseInt(elRecreoDuracion.value) : 30,
      respetarEspecialidad: elRespEspecialidad ? elRespEspecialidad.checked : true,
      respetarLimiteHoras: elRespLimiteHoras ? elRespLimiteHoras.checked : true,
      respetarDisponibilidad: elRespDisponibilidad ? elRespDisponibilidad.checked : true
    };
    try {
      AppData.config = await AppData.API.saveConfig(payload);
      showToast("\xC9xito", "Configuraci\xF3n de reglas guardada correctamente", "success");
    } catch (err) {
      showToast("Error", "No se pudo guardar la configuraci\xF3n", "error");
    }
  }

  // Web/src/prevalidation.ts
  var STATUS_ICONS = {
    ok: `<svg class="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
    warning: `<svg class="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
    error: `<svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
  };
  var STATUS_COLORS = {
    ok: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", badge: "bg-emerald-100 text-emerald-700" },
    warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", badge: "bg-amber-100 text-amber-700" },
    error: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", badge: "bg-red-100 text-red-700" }
  };
  function renderCheck(check) {
    const status = (check.status || "ok").toLowerCase();
    const colors = STATUS_COLORS[status] || STATUS_COLORS.ok;
    const icon = STATUS_ICONS[status] || STATUS_ICONS.ok;
    const detailsHtml = check.details && check.details.length > 0 ? `<div class="mt-2.5 pt-2 border-t border-red-200/60 space-y-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider ${colors.text} opacity-90">Detalles del conflicto (${check.details.length}):</div>
            <ul class="space-y-1 text-xs text-gray-700">
                ${check.details.map((d) => `<li class="flex items-start gap-1.5 leading-relaxed bg-white/70 p-2 rounded border border-red-100"><span class="text-red-500 font-bold">\u2022</span><span class="flex-1">${d}</span></li>`).join("")}
            </ul>
           </div>` : "";
    return `
        <div class="p-3.5 rounded-xl ${colors.bg} border ${colors.border} transition-all duration-200 shadow-sm">
            <div class="flex items-start gap-3">
                ${icon}
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <div class="font-bold text-sm ${colors.text}">${check.name}</div>
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.badge} uppercase tracking-wider">${status}</span>
                    </div>
                    <div class="text-xs text-gray-600 mt-1">${check.message}</div>
                    ${detailsHtml}
                </div>
            </div>
        </div>
    `;
  }
  async function runPrevalidation() {
    const modal = document.getElementById("prevalidation-modal");
    const body = document.getElementById("prevalidation-body");
    const summary = document.getElementById("prevalidation-summary");
    if (!modal || !body || !summary) return;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    body.innerHTML = `
        <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <span class="ml-3 text-gray-500 text-sm">Analizando viabilidad...</span>
        </div>
    `;
    summary.innerHTML = "";
    try {
      const result = await AppData.API.getPrevalidation();
      const errorCount = result.checks.filter((c) => (c.status || "").toLowerCase() === "error").length;
      const warnCount = result.checks.filter((c) => (c.status || "").toLowerCase() === "warning").length;
      const okCount = result.checks.filter((c) => (c.status || "").toLowerCase() === "ok").length;
      if (result.viable && errorCount === 0) {
        summary.innerHTML = `
                <div class="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    ${STATUS_ICONS.ok}
                    <div>
                        <div class="text-emerald-800 font-bold text-sm">Plantilla Viable \u2014 Todos los chequeos superados</div>
                        <div class="text-xs text-emerald-600 mt-0.5">El sistema puede generar los horarios sin conflictos estructurales.</div>
                    </div>
                    <span class="ml-auto text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">${okCount} OK</span>
                </div>
            `;
      } else {
        summary.innerHTML = `
                <div class="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                    ${STATUS_ICONS.error}
                    <div>
                        <div class="text-red-800 font-bold text-sm">Inviabilidad Detectada \u2014 ${errorCount} chequeo(s) con errores</div>
                        <div class="text-xs text-red-600 mt-0.5">Corrige los puntos se\xF1alados abajo para asegurar la viabilidad.</div>
                    </div>
                    <span class="ml-auto text-xs font-semibold px-2.5 py-1 bg-red-100 text-red-800 rounded-full">${errorCount} Error${errorCount !== 1 ? "es" : ""}</span>
                </div>
            `;
      }
      const sorted = [...result.checks].sort((a, b) => {
        const order = { error: 0, warning: 1, ok: 2 };
        const statusA = (a.status || "ok").toLowerCase();
        const statusB = (b.status || "ok").toLowerCase();
        return (order[statusA] ?? 2) - (order[statusB] ?? 2);
      });
      body.innerHTML = sorted.map(renderCheck).join("");
    } catch (err) {
      body.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <p class="font-bold">Error al ejecutar el diagn\xF3stico</p>
                <p class="text-sm text-gray-500 mt-1">${err}</p>
            </div>
        `;
    }
  }
  function closePrevalidation() {
    const modal = document.getElementById("prevalidation-modal");
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  }

  // Web/src/print_grid.ts
  var PRINT_DAYS = [
    { id: 1, name: "Lunes" },
    { id: 2, name: "Martes" },
    { id: 3, name: "Mi\xE9rcoles" },
    { id: 4, name: "Jueves" },
    { id: 5, name: "Viernes" }
  ];
  function generatePrintTimeSlots(startHour = 9, endHour = 14, slotMin = 30) {
    const slots = [];
    let currentMin = Math.max(0, startHour) * 60;
    const finishMin = Math.min(24, Math.max(startHour + 1, endHour)) * 60;
    const step = slotMin > 0 ? slotMin : 30;
    while (currentMin < finishMin) {
      const nextMin = currentMin + step;
      const h1 = Math.floor(currentMin / 60).toString().padStart(2, "0");
      const m1 = (currentMin % 60).toString().padStart(2, "0");
      const h2 = Math.floor(nextMin / 60).toString().padStart(2, "0");
      const m2 = (nextMin % 60).toString().padStart(2, "0");
      slots.push({
        startStr: `${h1}:${m1}`,
        endStr: `${h2}:${m2}`,
        startMin: currentMin,
        endMin: nextMin
      });
      currentMin = nextMin;
    }
    return slots;
  }
  function isRecessTimeSlot(slotMin, recessStartStr = "11:30", recessDuration = 30) {
    if (!recessStartStr || typeof recessStartStr !== "string" || !recessStartStr.includes(":")) return false;
    const parts = recessStartStr.split(":");
    const rStart = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    const rEnd = rStart + (recessDuration > 0 ? recessDuration : 30);
    return slotMin >= rStart && slotMin < rEnd;
  }

  // Web/src/print.ts
  function printAllSchedules() {
    if (!AppData.courses || AppData.courses.length === 0) {
      showToast("Info", "No hay cursos ni grupos registrados para imprimir.", "info");
      return;
    }
    let printArea = document.getElementById("print-area");
    if (!printArea) {
      printArea = document.createElement("div");
      printArea.id = "print-area";
      document.body.appendChild(printArea);
    }
    let startHour = 9;
    let endHour = 14;
    let slotMin = 30;
    if (AppData.config) {
      const partsStart = AppData.config.horaInicioClases.split(":");
      const partsEnd = AppData.config.horaFinClases.split(":");
      startHour = parseInt(partsStart[0]);
      endHour = parseInt(partsEnd[0]);
      slotMin = AppData.config.tiempoMinimo || 30;
    }
    const slots = generatePrintTimeSlots(startHour, endHour, slotMin);
    const days = PRINT_DAYS;
    const subjectMap = new Map(AppData.subjects.map((s) => [s.id, s]));
    const teacherMap = new Map(AppData.teachers.map((t) => [t.id, t]));
    const groupCourseMap = /* @__PURE__ */ new Map();
    AppData.courses.forEach((course) => {
      course.groups.forEach((group) => {
        groupCourseMap.set(group.id, { course, group });
      });
    });
    let html = "";
    AppData.courses.forEach((course) => {
      course.groups.forEach((group) => {
        const groupClasses = AppData.scheduledClasses.filter((c) => c.groupId === group.id);
        html += `
                <div class="print-page">
                    <div class="flex justify-between items-center mb-2 border-b-2 border-indigo-600 pb-1">
                        <div>
                            <h1 class="text-xl font-bold text-gray-900 leading-tight">${course.name} - Grupo ${group.name}</h1>
                            <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Horario Lectivo Oficial \u2022 EduSchedule</p>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">Clases: ${groupClasses.length}</span>
                        </div>
                    </div>

                    <table class="w-full border-collapse border border-gray-300 text-xs table-fixed">
                        <thead>
                            <tr class="bg-slate-800 text-white font-bold border-b border-gray-300">
                                <th class="p-1 border border-gray-300 w-20 text-center text-[10px]">Hora</th>
                                ${days.map((d) => `<th class="p-1 border border-gray-300 text-center text-[11px]">${d.name}</th>`).join("")}
                            </tr>
                        </thead>
                        <tbody>
            `;
        const skipSlotDayCourse = /* @__PURE__ */ new Map();
        days.forEach((d) => skipSlotDayCourse.set(d.id, /* @__PURE__ */ new Set()));
        slots.forEach((slot, sIdx) => {
          const recessStart = AppData.config ? AppData.config.horaInicioRecreo : "11:30";
          const recessDur = AppData.config ? AppData.config.duracionRecreo : 30;
          const isRecess2 = isRecessTimeSlot(slot.startMin, recessStart, recessDur);
          if (isRecess2) {
            html += `
                        <tr class="bg-gray-100 text-gray-500 font-semibold">
                            <td class="p-1 border border-gray-300 text-center font-mono text-[9px]">${slot.startStr} - ${slot.endStr}</td>
                            <td colspan="5" class="p-1 border border-gray-300 text-center bg-gray-100 text-slate-500 text-[10px]">\u2615 Recreo</td>
                        </tr>
                    `;
            return;
          }
          html += `<tr>`;
          html += `<td class="p-1 border border-gray-300 text-center font-mono text-[9px] font-medium bg-gray-50">${slot.startStr} - ${slot.endStr}</td>`;
          days.forEach((day) => {
            if (skipSlotDayCourse.get(day.id).has(sIdx)) {
              return;
            }
            const matchCls = groupClasses.find((cls) => {
              const dt = new Date(cls.start);
              const dNum = dt.getDay();
              if (dNum !== day.id) return false;
              const cMin = dt.getHours() * 60 + dt.getMinutes();
              return cMin === slot.startMin;
            });
            if (matchCls) {
              const subject = subjectMap.get(matchCls.subjectId);
              const teacher = teacherMap.get(matchCls.teacherId);
              const bgColor = getSubjectColor(matchCls.subjectId);
              const pinIcon = matchCls.isPinned ? "\u{1F4CC} " : "";
              let isMerged1h = false;
              const nextSlot = sIdx + 1 < slots.length ? slots[sIdx + 1] : null;
              if (nextSlot) {
                const nextIsRecess = isRecessTimeSlot(nextSlot.startMin, recessStart, recessDur);
                if (!nextIsRecess) {
                  const nextCls = groupClasses.find((cls) => {
                    const dt = new Date(cls.start);
                    if (dt.getDay() !== day.id) return false;
                    const cMin = dt.getHours() * 60 + dt.getMinutes();
                    return cMin === nextSlot.startMin;
                  });
                  if (nextCls && nextCls.subjectId === matchCls.subjectId && nextCls.teacherId === matchCls.teacherId && nextCls.groupId === matchCls.groupId) {
                    isMerged1h = true;
                    skipSlotDayCourse.get(day.id).add(sIdx + 1);
                  }
                }
              }
              const rowspanAttr = isMerged1h ? 'rowspan="2"' : "";
              const durLabel = isMerged1h ? " (1h)" : "";
              html += `
                            <td ${rowspanAttr} class="p-1 border border-gray-300 align-middle text-white font-medium shadow-inner" style="background-color: ${bgColor} !important; color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
                                <div class="font-bold text-[10px] truncate leading-tight">${pinIcon}${subject ? subject.name : "Clase"}${durLabel}</div>
                                ${teacher ? `<div class="text-[9px] opacity-95 truncate leading-tight font-normal">Prof: ${teacher.name}</div>` : ""}
                            </td>
                        `;
            } else {
              html += `<td class="p-1 border border-gray-300 text-center text-gray-300 bg-white text-[9px]">--</td>`;
            }
          });
          html += `</tr>`;
        });
        html += `
                        </tbody>
                    </table>
                </div>
            `;
      });
    });
    AppData.teachers.forEach((teacher) => {
      const teacherClasses = AppData.scheduledClasses.filter((c) => c.teacherId === teacher.id);
      const totalHours = teacherClasses.reduce((sum, c) => sum + c.duration, 0);
      html += `
            <div class="print-page">
                <div class="flex justify-between items-center mb-2 border-b-2 border-indigo-600 pb-1">
                    <div>
                        <h1 class="text-xl font-bold text-gray-900 leading-tight">Horario Personal Docente: ${teacher.name}</h1>
                        <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Horario Individual \u2022 EduSchedule</p>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">Jornada: ${totalHours.toFixed(1)}h</span>
                    </div>
                </div>

                <table class="w-full border-collapse border border-gray-300 text-xs table-fixed">
                    <thead>
                        <tr class="bg-slate-800 text-white font-bold border-b border-gray-300">
                            <th class="p-1 border border-gray-300 w-20 text-center text-[10px]">Hora</th>
                            ${days.map((d) => `<th class="p-1 border border-gray-300 text-center text-[11px]">${d.name}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
        `;
      const skipSlotDayTeacher = /* @__PURE__ */ new Map();
      days.forEach((d) => skipSlotDayTeacher.set(d.id, /* @__PURE__ */ new Set()));
      slots.forEach((slot, sIdx) => {
        const recessStart = AppData.config ? AppData.config.horaInicioRecreo : "11:30";
        const recessDur = AppData.config ? AppData.config.duracionRecreo : 30;
        const isRecess2 = isRecessTimeSlot(slot.startMin, recessStart, recessDur);
        if (isRecess2) {
          html += `
                    <tr class="bg-gray-100 text-gray-500 font-semibold">
                        <td class="p-1 border border-gray-300 text-center font-mono text-[9px]">${slot.startStr} - ${slot.endStr}</td>
                        <td colspan="5" class="p-1 border border-gray-300 text-center bg-gray-100 text-slate-500 text-[10px]">\u2615 Recreo</td>
                    </tr>
                `;
          return;
        }
        html += `<tr>`;
        html += `<td class="p-1 border border-gray-300 text-center font-mono text-[9px] font-medium bg-gray-50">${slot.startStr} - ${slot.endStr}</td>`;
        days.forEach((day) => {
          if (skipSlotDayTeacher.get(day.id).has(sIdx)) {
            return;
          }
          const matchCls = teacherClasses.find((cls) => {
            const dt = new Date(cls.start);
            const dNum = dt.getDay();
            if (dNum !== day.id) return false;
            const cMin = dt.getHours() * 60 + dt.getMinutes();
            return cMin === slot.startMin;
          });
          if (matchCls) {
            const subject = subjectMap.get(matchCls.subjectId);
            const groupInfo = groupCourseMap.get(matchCls.groupId);
            const bgColor = getSubjectColor(matchCls.subjectId);
            const pinIcon = matchCls.isPinned ? "\u{1F4CC} " : "";
            let isMerged1h = false;
            const nextSlot = sIdx + 1 < slots.length ? slots[sIdx + 1] : null;
            if (nextSlot) {
              const nextIsRecess = isRecessTimeSlot(nextSlot.startMin, recessStart, recessDur);
              if (!nextIsRecess) {
                const nextCls = teacherClasses.find((cls) => {
                  const dt = new Date(cls.start);
                  if (dt.getDay() !== day.id) return false;
                  const cMin = dt.getHours() * 60 + dt.getMinutes();
                  return cMin === nextSlot.startMin;
                });
                if (nextCls && nextCls.subjectId === matchCls.subjectId && nextCls.teacherId === matchCls.teacherId && nextCls.groupId === matchCls.groupId) {
                  isMerged1h = true;
                  skipSlotDayTeacher.get(day.id).add(sIdx + 1);
                }
              }
            }
            const rowspanAttr = isMerged1h ? 'rowspan="2"' : "";
            const durLabel = isMerged1h ? " (1h)" : "";
            const groupNameStr = groupInfo ? `${groupInfo.course.name} - ${groupInfo.group.name}` : `Grupo`;
            html += `
                        <td ${rowspanAttr} class="p-1 border border-gray-300 align-middle text-white font-medium shadow-inner" style="background-color: ${bgColor} !important; color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
                            <div class="font-bold text-[10px] truncate leading-tight">${pinIcon}${subject ? subject.name : "Clase"}${durLabel}</div>
                            <div class="text-[9px] opacity-95 truncate leading-tight font-normal">${groupNameStr}</div>
                        </td>
                    `;
          } else {
            html += `<td class="p-1 border border-gray-300 text-center text-gray-300 bg-white text-[9px]">--</td>`;
          }
        });
        html += `</tr>`;
      });
      html += `
                    </tbody>
                </table>
            </div>
        `;
    });
    printArea.innerHTML = html;
    window.print();
  }

  // Web/src/updater.ts
  var CURRENT_VERSION = "0.0.9";
  var GITHUB_REPO = "guillemo12/Horarios-profesores";
  function parseVersion(versionStr) {
    const clean = versionStr.replace(/^v/, "").trim();
    return clean.split(".").map((n) => parseInt(n, 10) || 0);
  }
  function isNewerVersion(latestTag, currentVersion = CURRENT_VERSION) {
    const latest = parseVersion(latestTag);
    const current = parseVersion(currentVersion);
    const maxLen = Math.max(latest.length, current.length);
    for (let i = 0; i < maxLen; i++) {
      const l = latest[i] ?? 0;
      const c = current[i] ?? 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  }
  function getBestAssetForPlatform(assets) {
    if (!assets || assets.length === 0) return null;
    const isWin = navigator.userAgent.includes("Windows") || navigator.platform.includes("Win");
    const isLinux = navigator.userAgent.includes("Linux");
    if (isWin) {
      const nsis = assets.find((a) => a.name.endsWith("-setup.exe"));
      if (nsis) return nsis;
      const exeUnico = assets.find((a) => a.name.includes("Unico") && a.name.endsWith(".exe"));
      if (exeUnico) return exeUnico;
      const exe = assets.find((a) => a.name.endsWith(".exe"));
      if (exe) return exe;
      const msi = assets.find((a) => a.name.endsWith(".msi"));
      if (msi) return msi;
    }
    if (isLinux) {
      const appImage = assets.find((a) => a.name.endsWith(".AppImage"));
      if (appImage) return appImage;
      const deb = assets.find((a) => a.name.endsWith(".deb"));
      if (deb) return deb;
    }
    return assets[0] || null;
  }
  function isDevEnvironment() {
    const isTauri = typeof window !== "undefined" && ("__TAURI__" in window || "__TAURI_INTERNALS__" in window || "__TAURI_METADATA__" in window);
    if (isTauri) return false;
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "" || host.startsWith("192.168.");
  }
  async function checkForUpdates(silent = false) {
    if (isDevEnvironment()) {
      if (!silent) {
        showToast("Modo Desarrollo", "Los avisos de actualizaci\xF3n est\xE1n desactivados en entorno de desarrollo.", "info");
      }
      return;
    }
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { "Accept": "application/vnd.github.v3+json" }
      });
      if (!res.ok) {
        if (!silent) {
          showToast("Actualizaciones", "No se encontr\xF3 ning\xFAn release publicado en GitHub.", "warning");
        }
        return;
      }
      const release = await res.json();
      const hasUpdate = isNewerVersion(release.tag_name, CURRENT_VERSION);
      if (hasUpdate) {
        showUpdateModal(release);
      } else if (!silent) {
        showToast("Actualizado", `EduSchedule est\xE1 al d\xEDa (v${CURRENT_VERSION}).`, "success");
      }
    } catch (err) {
      console.error("Error al buscar actualizaciones:", err);
      if (!silent) {
        showToast("Error", "Error de red al consultar actualizaciones.", "error");
      }
    }
  }
  function showUpdateModal(release) {
    let modal = document.getElementById("modal-update-dialog");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "modal-update-dialog";
      modal.className = "fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4";
      document.body.appendChild(modal);
    }
    const bestAsset = getBestAssetForPlatform(release.assets);
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden transition-all transform scale-100">
            <div class="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                        \u{1F680}
                    </div>
                    <div>
                        <h3 class="font-bold text-lg leading-tight">\xA1Nueva versi\xF3n disponible!</h3>
                        <p class="text-xs text-indigo-100 font-medium">v${CURRENT_VERSION} \u2794 <span class="font-bold text-white">${release.tag_name}</span></p>
                    </div>
                </div>
                <button onclick="document.getElementById('modal-update-dialog')?.remove()" class="text-white/80 hover:text-white text-2xl leading-none font-bold cursor-pointer transition-colors">&times;</button>
            </div>
            
            <div class="p-6 space-y-4">
                <div>
                    <h4 class="font-semibold text-slate-800 text-sm mb-1.5">${release.name || release.tag_name}</h4>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 max-h-44 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">
                        ${release.body || "Se han incluido mejoras de rendimiento, estabilidad y nuevas funciones."}
                    </div>
                </div>

                <div id="update-action-container" class="pt-2">
                    <button id="btn-trigger-update" class="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <span>\u26A1 Actualizar Ahora</span>
                    </button>
                    <p class="text-center text-[11px] text-slate-400 mt-2">
                        Se descargar\xE1 e instalar\xE1 autom\xE1ticamente la nueva versi\xF3n.
                    </p>
                </div>

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button onclick="document.getElementById('modal-update-dialog')?.remove()" class="px-3.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-medium transition-colors cursor-pointer">
                        Recordar m\xE1s tarde
                    </button>
                    <a href="${release.html_url}" target="_blank" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline flex items-center gap-1">
                        Ver notas completas en GitHub \u2197
                    </a>
                </div>
            </div>
        </div>
    `;
    const updateBtn = document.getElementById("btn-trigger-update");
    if (updateBtn && bestAsset) {
      updateBtn.addEventListener("click", async () => {
        await performOneClickUpdate(bestAsset, release);
      });
    } else if (updateBtn) {
      updateBtn.addEventListener("click", () => {
        window.open(release.html_url, "_blank");
      });
    }
  }
  async function performOneClickUpdate(asset, release) {
    const container = document.getElementById("update-action-container");
    if (!container) return;
    container.innerHTML = `
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center space-y-3">
            <div class="flex items-center justify-center gap-3">
                <svg class="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="font-semibold text-xs text-indigo-900" id="update-status-text">Descargando actualizaci\xF3n (${asset.name})...</span>
            </div>
            <div class="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden">
                <div class="bg-indigo-600 h-2 rounded-full animate-pulse w-full"></div>
            </div>
            <p class="text-[11px] text-indigo-600/80">Por favor, espere. El programa se reiniciar\xE1 autom\xE1ticamente al terminar.</p>
        </div>
    `;
    try {
      const response = await fetch("/api/v1/system/update/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          downloadUrl: asset.browser_download_url,
          fileName: asset.name
        })
      });
      if (response.ok) {
        const statusText = document.getElementById("update-status-text");
        if (statusText) {
          statusText.innerText = "\xA1Descarga completa! Iniciando instalador...";
        }
        showToast("Actualizaci\xF3n", "La aplicaci\xF3n se est\xE1 reiniciando con la nueva versi\xF3n.", "success");
      } else {
        throw new Error(`Servidor devolvi\xF3 status ${response.status}`);
      }
    } catch (err) {
      console.error("Error al ejecutar actualizaci\xF3n de un clic:", err);
      showToast("Error de actualizaci\xF3n", "No se pudo actualizar autom\xE1ticamente. Abriendo descarga directa.", "warning");
      container.innerHTML = `
            <div class="space-y-2">
                <p class="text-xs text-rose-600 font-medium text-center">No se pudo completar autom\xE1ticamente. Puede descargar el instalador directamente:</p>
                <a href="${asset.browser_download_url}" target="_blank" class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2">
                    \u2B07\uFE0F Descargar ${asset.name}
                </a>
            </div>
        `;
    }
  }

  // Web/src/navigation.ts
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
    if (tabId === "settings") loadSettings();
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
      courseSelect.innerHTML = AppData.courses.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
      if (currentCourseValue && Array.from(courseSelect.options).some((opt) => opt.value === currentCourseValue)) {
        courseSelect.value = currentCourseValue;
      }
      onHeaderCourseChange(currentValue);
    } else {
      courseSelect.classList.add("hidden");
      courseSeparator.classList.add("hidden");
      entitySelect.innerHTML = AppData.teachers.map((t) => `<option value="${t.id}">${t.name}</option>`).join("");
      if (currentValue && Array.from(entitySelect.options).some((opt) => opt.value === currentValue)) {
        entitySelect.value = currentValue;
      }
      refreshCalendarView();
    }
  }
  function onHeaderCourseChangeWrapper() {
    onHeaderCourseChange(null);
  }

  // Web/src/backup_manager.ts
  function isDatabaseFileValid(fileName) {
    if (!fileName || typeof fileName !== "string") return false;
    const lower = fileName.toLowerCase().trim();
    return lower.endsWith(".db") || lower.endsWith(".sqlite");
  }
  function generateBackupFilename(date = /* @__PURE__ */ new Date()) {
    const isoDate = date.toISOString().split("T")[0];
    return `EduSchedule_Backup_${isoDate}.db`;
  }
  async function exportDatabase() {
    try {
      showToast("Copia de Seguridad", "Preparando archivo de base de datos...", "info");
      const res = await fetch("/api/v1/system/database/export");
      if (!res.ok) {
        throw new Error(`Error en el servidor: ${res.statusText}`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      let filename = generateBackupFilename();
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      showToast("Copia de Seguridad", `Base de datos exportada: ${filename}`, "success");
    } catch (err) {
      console.error("Error al exportar base de datos:", err);
      showToast("Error", `No se pudo exportar la base de datos: ${err.message}`, "error");
    }
  }
  async function handleImportDatabaseFile(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    input.value = "";
    if (!isDatabaseFileValid(file.name)) {
      showToast("Archivo no v\xE1lido", "Por favor selecciona un archivo .db o .sqlite v\xE1lido.", "warning");
      return;
    }
    const confirmed = confirm(`\xBFEst\xE1s seguro de que deseas restaurar la copia de seguridad "${file.name}"?

Esta acci\xF3n reemplazar\xE1 la base de datos actual y actualizar\xE1 toda la informaci\xF3n.`);
    if (!confirmed) return;
    try {
      showToast("Restaurando", "Validando e importando base de datos...", "info");
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/system/database/import", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Restauraci\xF3n Completada", "La base de datos se ha restaurado con \xE9xito. Actualizando vista...", "success");
        await loadAllData();
        loadSettings();
        refreshCalendarView();
        updateEntitySelector2();
      } else {
        throw new Error(data.message || "Error desconocido al importar.");
      }
    } catch (err) {
      console.error("Error al restaurar base de datos:", err);
      showToast("Error de Restauraci\xF3n", `No se pudo restaurar la base de datos: ${err.message}`, "error");
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
    currentEventContext: null,
    currentCourseId: null
  };
  function sendErrorToServer(level, message, source = "", line = 0, stack = "") {
    fetch("/api/v1/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, message, source, line, stack: stack ?? "" })
    }).catch(() => {
    });
  }
  window.onerror = (msg, src, lineno, _col, err) => {
    sendErrorToServer("error", String(msg), src ?? "", lineno ?? 0, err?.stack ?? "");
    return false;
  };
  window.addEventListener("unhandledrejection", (e) => {
    const err = e.reason;
    const msg = err instanceof Error ? err.message : String(err);
    sendErrorToServer("error", `Unhandled Promise Rejection: ${msg}`, "", 0, err?.stack ?? "");
  });
  var _originalConsoleError = console.error.bind(console);
  console.error = (...args) => {
    _originalConsoleError(...args);
    const message = args.map((a) => a instanceof Error ? a.message : String(a)).join(" ");
    const stack = args.find((a) => a instanceof Error)?.stack ?? "";
    sendErrorToServer("error", message, "console.error", 0, stack);
  };
  async function waitForBackend(maxRetries = 15, delayMs = 1e3) {
    const loaderText = document.getElementById("loader-text");
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (loaderText && attempt > 1) {
          loaderText.textContent = `Iniciando motor y servidor local... (${attempt}/${maxRetries})`;
        }
        const res = await fetch("/api/v1/config", { cache: "no-store" });
        if (res.ok) return true;
      } catch (_) {
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return false;
  }
  async function loadAllData() {
    const [subjects, teachers, courses, scheduledClasses, config] = await Promise.all([
      AppData.API.getSubjects(),
      AppData.API.getTeachers(),
      AppData.API.getCourses(),
      AppData.API.getSchedule(),
      AppData.API.getConfig()
    ]);
    AppData.subjects = subjects;
    AppData.teachers = teachers;
    AppData.courses = courses;
    AppData.scheduledClasses = scheduledClasses;
    AppData.config = config;
  }
  window.onload = async function() {
    try {
      const isReady = await waitForBackend();
      if (!isReady) {
        throw new Error("No se pudo conectar con el servidor Ktor tras varios intentos.");
      }
      await loadAllData();
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
      setTimeout(() => {
        checkForUpdates(true);
      }, 2e3);
    } catch (err) {
      console.error("Init Error:", err);
      const loaderText = document.getElementById("loader-text");
      if (loaderText) {
        loaderText.textContent = "Error conectando con la API local. Aseg\xFArese de que el servidor Ktor est\xE9 encendido.";
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
      const elTooltipText = document.getElementById("score-soft-tooltip-text");
      if (elHard) elHard.textContent = scores.hard.toString();
      if (elSoft) {
        const pct = scores.porcentaje !== void 0 && !isNaN(scores.porcentaje) ? Math.min(100, Math.max(0, scores.porcentaje)).toFixed(1) + "%" : "0.0%";
        elSoft.textContent = pct;
      }
      if (elTooltipText) {
        const rawObj = scores.rawObjective || scores.soft || 0;
        const boundVal = scores.bound || 0;
        elTooltipText.innerHTML = `Puntos: <b class="text-white">${rawObj.toLocaleString()}</b> / <b class="text-indigo-400">${boundVal.toLocaleString()}</b> pts`;
      }
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
      const elCount = document.getElementById("conflict-tooltip-count");
      const elList = document.getElementById("conflict-tooltip-list");
      if (elCount && elList) {
        const conflicts = scores.conflictos || [];
        elCount.textContent = conflicts.length.toString();
        if (conflicts.length === 0) {
          elList.innerHTML = '<li class="text-slate-400 italic">No hay solapamientos ni conflictos detectados.</li>';
        } else {
          elList.innerHTML = conflicts.map((c) => `<li class="flex items-start gap-1.5"><span class="text-red-400 font-bold">\u2022</span><span>${c}</span></li>`).join("");
        }
      }
    });
    AppData.WS.on("schedule_updated", (classes) => {
      AppData.scheduledClasses = classes;
      refreshCalendarView();
    });
    AppData.WS.on("optimization_finished", (classes) => {
      AppData.scheduledClasses = classes;
      refreshCalendarView();
      toggleOptimizationEngine(true);
      showToast("Optimizaci\xF3n completada", "El motor ha encontrado la mejor distribuci\xF3n de horarios.", "success");
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
  Object.assign(window, {
    AppData,
    loadAllData,
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
    saveNewClass: saveNewClass2,
    closeAddClassModal,
    openAddClassModal,
    onModalCourseChange,
    onModalSubjectChange,
    onModalGroupChange,
    updateModalTeacherOptions,
    openEventDetail,
    closeEventDetail,
    refreshCalendarView,
    updateDateRange,
    showToast,
    openCourseSubjects,
    openAvailabilityModal,
    closeAvailabilityModal,
    saveAvailability,
    saveSettings,
    clearGroupSchedule,
    clearGroupAssignments,
    clearCourseAssignments,
    toggleAvailabilitySlot,
    runPrevalidation,
    closePrevalidation,
    toggleColorMode: toggleColorMode2,
    printAllSchedules,
    checkForUpdates,
    exportDatabase,
    handleImportDatabaseFile
  });
})();
//# sourceMappingURL=Datos.js.map
