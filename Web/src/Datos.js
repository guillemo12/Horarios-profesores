(()=>{var $e=Object.defineProperty;var He=(t,e,r)=>e in t?$e(t,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):t[e]=r;var T=(t,e,r)=>He(t,typeof e!="symbol"?e+"":e,r);var N=class{constructor(){T(this,"baseUrl");this.baseUrl="/api/v1"}async _fetch(e,r="GET",o=null){let n=`${this.baseUrl}/${e}`,a={method:r,headers:{"Content-Type":"application/json"}};o&&(a.body=JSON.stringify(o));let d=await fetch(n,a);if(!d.ok)throw new Error(`HTTP error! status: ${d.status}`);return r==="DELETE"?{success:!0}:await d.json()}async getConfig(){return this._fetch("config")}async saveConfig(e){return this._fetch("config","PUT",e)}async getSubjects(){return this._fetch("subjects")}async saveSubject(e){return e.id?this._fetch("subjects","PUT",e):this._fetch("subjects","POST",e)}async deleteSubject(e){return this._fetch(`subjects/${e}`,"DELETE")}async getTeachers(){return this._fetch("teachers")}async saveTeacher(e){return e.id?this._fetch("teachers","PUT",e):this._fetch("teachers","POST",e)}async deleteTeacher(e){return this._fetch(`teachers/${e}`,"DELETE")}async getCourses(){return this._fetch("courses")}async saveCourse(e){return e.id?this._fetch("courses","PUT",e):this._fetch("courses","POST",e)}async deleteCourse(e){return this._fetch(`courses/${e}`,"DELETE")}async updateCourseGroup(e,r){return this._fetch(`courses/${e}/groups`,"PUT",r)}async getSchedule(){return this._fetch("scheduledClasses")}async saveClass(e){return this._fetch("scheduledClasses","POST",e)}async updateClass(e){return this._fetch("scheduledClasses","PUT",e)}async deleteClass(e){return this._fetch(`scheduledClasses/${e}`,"DELETE")}async deleteGroupSchedule(e){return this._fetch(`scheduledClasses/group/${e}`,"DELETE")}async getPrevalidation(){return this._fetch("prevalidation")}};function l(t,e,r="info"){let o=document.getElementById("toast-container");if(!o)return;let n=document.createElement("div"),a=r==="error"?"border-red-500 text-red-500":r==="success"?"border-green-500 text-green-500":r==="warning"?"border-yellow-500 text-yellow-500":"border-blue-500 text-blue-500";n.className=`bg-white border-l-4 ${a} shadow-lg rounded-r-lg p-4 w-80 transform transition-all duration-300 translate-y-4 opacity-0 flex gap-3`,n.innerHTML=`<div><h4 class="text-sm font-bold text-gray-800">${t}</h4><p class="text-xs text-gray-600 mt-1">${e}</p></div>`,o.appendChild(n),setTimeout(()=>n.classList.remove("translate-y-4","opacity-0"),10),setTimeout(()=>{n.classList.add("opacity-0","translate-x-full"),setTimeout(()=>n.remove(),300)},4e3)}function j(t){return Number(t.toFixed(2)).toString()}var R=class{constructor(){T(this,"isConnected");T(this,"isOptimizing");T(this,"wsUrl");T(this,"callbacks");T(this,"socket");this.wsUrl=(window.location.protocol==="https:"?"wss://":"ws://")+window.location.host+"/ws",this.isConnected=!1,this.isOptimizing=!1,this.callbacks={},this.socket=null}connect(){this.socket=new WebSocket(this.wsUrl),this.socket.onopen=()=>{this.isConnected=!0,this._trigger("connected")},this.socket.onclose=()=>{this.isConnected=!1,this._trigger("disconnected"),setTimeout(()=>this.connect(),5e3)},this.socket.onerror=e=>{console.error("WebSocket error:",e)},this.socket.onmessage=e=>{try{let r=JSON.parse(e.data);r.type==="scores_updated"?this._trigger("scores_updated",r):r.type==="schedule_pushed"?this._trigger("schedule_pushed",r.schedule):r.type==="optimization_complete"?this._trigger("optimization_complete"):r.type==="optimization_stopped"&&(this.isOptimizing=!1)}catch(r){console.error("Error parsing WS message:",r)}}}on(e,r){this.callbacks[e]=r}_trigger(e,r){this.callbacks[e]&&this.callbacks[e](r)}sendCommand(e,r={}){try{if(!this.isConnected||!this.socket){l("Error","WebSocket Desconectado","error");return}this.socket.send(JSON.stringify({command:e,payload:r})),e==="START"?(this.isOptimizing=!0,l("Motor Iniciado","Servidor analizando el \xE1rbol de posibilidades (WS)...","info")):e==="STOP"&&(this.isOptimizing=!1,l("Motor Pausado","Optimizaci\xF3n detenida.","warning"))}catch(o){throw console.error("Error sending WS command:",o),l("Error de Comunicaci\xF3n","No se pudo enviar el comando al servidor","error"),o}}};function G(){if(!s.calendarInstance)return;let t=s.calendarInstance.getDateRangeStart(),e=s.calendarInstance.getDateRangeEnd(),r=n=>{let a=typeof n.toDate=="function"?n.toDate():new Date(n),d=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];return`${a.getDate()} ${d[a.getMonth()]}`},o=document.getElementById("calendar-date-range");o&&(o.textContent=`${r(t)} - ${r(e)}`)}function U(t=null){let e=document.getElementById("header-course-select"),r=document.getElementById("view-entity-select");if(!e||!r)return;let o=e.value;r.innerHTML="";let n=s.courses.find(a=>a.id===o);n&&(n.groups.length===0?r.innerHTML='<option value="">Sin grupos</option>':n.groups.forEach(a=>r.innerHTML+=`<option value="${a.id}">Grupo ${a.name}</option>`)),t&&Array.from(r.options).some(a=>a.value===t)&&(r.value=t),E()}function ee(){if(typeof tui>"u")return;let t=tui.Calendar;s.calendarInstance=new t("#calendar",{defaultView:"week",useFormPopup:!1,useDetailPopup:!1,week:{taskView:!1,eventView:["time"],dayNames:["Dom","Lunes","Martes","Mi\xE9rcoles","Jueves","Viernes","S\xE1b"],workweek:!0,hourStart:8,hourEnd:15},calendars:[{id:"default",name:"Clases",backgroundColor:"#4f46e5"},{id:"pinned",name:"Fijadas",backgroundColor:"#059669"},{id:"recess",name:"Recreo",backgroundColor:"#f1f5f9",borderColor:"#94a3b8",color:"#64748b"}],template:{weekDayName(e){return`<span class="toastui-calendar-day-name-item">${e.dayName}</span>`},time(e){return e.calendarId==="recess"?'<div class="p-1 font-semibold text-slate-500 text-xs">\u2615 Recreo</div>':`
                    <div class="p-1 flex flex-col justify-center h-full overflow-hidden text-white leading-tight">
                        <div class="font-bold text-xs truncate">${e.title}</div>
                        ${e.body?`<div class="text-[11px] font-medium opacity-90 truncate mt-0.5">${e.body}</div>`:""}
                    </div>
                `}}}),se(),s.calendarInstance.on("selectDateTime",function(e){s.calendarInstance.clearGridSelections();let r=typeof e.start.toDate=="function"?e.start.toDate():new Date(e.start),o=typeof e.end.toDate=="function"?e.end.toDate():new Date(e.end);F(r,o)}),s.calendarInstance.on("beforeUpdateEvent",async function(e){let{event:r,changes:o}=e,n=s.scheduledClasses.find(c=>c.id===r.id);if(!n)return;if(n.isPinned){l("Bloqueado","No puedes mover ni alterar una clase que est\xE1 fijada (Pin).","warning");return}let a=n.start,d=n.end;if(o.start&&(a=typeof o.start.toDate=="function"?o.start.toDate():new Date(o.start)),o.end&&(d=typeof o.end.toDate=="function"?o.end.toDate():new Date(o.end)),oe(new Date(a),new Date(d))){l("Error","No se puede programar una clase durante el recreo (12:00 - 12:30).","error"),E();return}o.start&&(n.start=typeof o.start.toDate=="function"?o.start.toDate():new Date(o.start)),o.end&&(n.end=typeof o.end.toDate=="function"?o.end.toDate():new Date(o.end)),n.duration=(new Date(n.end).getTime()-new Date(n.start).getTime())/(1e3*60*60),s.calendarInstance.updateEvent(r.id,r.calendarId,o),l("Sincronizando...","Guardando nueva posici\xF3n en el servidor...","info"),await s.API.updateClass(n),s.WS.sendCommand("MANUAL_EDIT",{id:n.id,action:"moved"})}),s.calendarInstance.on("clickEvent",e=>Pe(e.event))}function F(t=null,e=null){if(!t){let f=new Date,g=f.getDate()-f.getDay()+(f.getDay()===0?-6:1);t=new Date(f.setDate(g)),t.setHours(9,0,0,0),e=new Date(t),e.setHours(10,0,0,0)}let r=f=>f.toTimeString().slice(0,5);document.getElementById("modal-class-start").value=t.toISOString(),document.getElementById("modal-class-end").value=e.toISOString(),document.getElementById("modal-time-start").value=r(t),document.getElementById("modal-time-end").value=r(e);let o=document.getElementById("view-type-select"),n=document.getElementById("header-course-select"),a=document.getElementById("view-entity-select"),d=o?.value,c=n?.value,i=a?.value,u=document.getElementById("modal-subject"),p=document.getElementById("modal-course"),b=document.getElementById("modal-group"),m=document.getElementById("modal-teacher");if(u.innerHTML=s.subjects.map(f=>`<option value="${f.id}">${f.name}</option>`).join(""),p.innerHTML=s.courses.map(f=>`<option value="${f.id}">${f.name}</option>`).join(""),m.innerHTML=s.teachers.map(f=>`<option value="${f.id}">${f.name}</option>`).join(""),p.disabled=!1,b.disabled=!1,m.disabled=!1,d==="group"&&c)p.value=c,p.disabled=!0,B(),i&&(b.value=i,b.disabled=!0);else if(d==="teacher"&&i){m.value=i,m.disabled=!0,B();let f=s.teachers.find(g=>g.id===i);f&&f.subjects&&f.subjects.length>0&&(u.value=f.subjects[0])}else B();let h=document.getElementById("add-class-modal");h&&(h.classList.replace("hidden","flex"),h.onclick=f=>{f.target===h&&_()})}function B(){let t=document.getElementById("modal-course").value,e=document.getElementById("modal-group");e.innerHTML="";let r=s.courses.find(o=>o.id===t);r&&r.groups.length>0?r.groups.forEach(o=>{e.innerHTML+=`<option value="${o.id}">Grupo ${o.name}</option>`}):e.innerHTML='<option value="">(Sin grupos)</option>'}function _(){let t=document.getElementById("add-class-modal");t&&t.classList.replace("flex","hidden")}async function te(){let t=document.getElementById("modal-class-start").value,e=document.getElementById("modal-class-end").value,r=new Date(t),o=new Date(e),n=document.getElementById("modal-time-start").value.split(":"),a=document.getElementById("modal-time-end").value.split(":");r.setHours(parseInt(n[0]),parseInt(n[1]),0,0),o.setHours(parseInt(a[0]),parseInt(a[1]),0,0);let d=document.getElementById("modal-subject").value,c=document.getElementById("modal-group").value,i=document.getElementById("modal-teacher").value;if(!c||!i){l("Error","Faltan datos por seleccionar (Grupo o Profesor)","error");return}if(oe(r,o)){l("Error","No se puede programar una clase durante el recreo (12:00 - 12:30).","error");return}let p=(o.getTime()-r.getTime())/(1e3*60*60),b={id:"evt-"+Date.now(),start:r.toISOString(),end:o.toISOString(),duration:p,subjectId:d,groupId:c,teacherId:i,isPinned:!1};l("Guardando...","Enviando bloque a la base de datos API","info"),await s.API.saveClass(b),s.scheduledClasses.push(b),_(),E(),s.WS.sendCommand("MANUAL_EDIT",{id:b.id})}var Z=["#4f46e5","#0284c7","#059669","#d97706","#dc2626","#7c3aed","#db2777","#2563eb","#0d9488","#ca8a04","#ea580c","#e11d48","#9333ea","#16a34a"];function A(t){if(!t)return"#4f46e5";let e=0;for(let o=0;o<t.length;o++)e=t.charCodeAt(o)+((e<<5)-e);let r=Math.abs(e)%Z.length;return Z[r]}function re(){s.colorMode||(s.colorMode="teacher"),s.colorMode=s.colorMode==="teacher"?"subject":"teacher";let t=document.getElementById("btn-color-mode-text");t&&(t.textContent=s.colorMode==="teacher"?"Color: Profesor":"Color: Asignatura");let e=document.getElementById("btn-color-mode-icon");e&&(e.textContent=s.colorMode==="teacher"?"\u{1F3A8}":"\u{1F4DA}"),E()}function E(){let t=document.getElementById("view-type-select"),e=document.getElementById("view-entity-select");if(!t||!e)return;let r=t.value,o=e.value;if(s.calendarInstance&&(s.calendarInstance.clear(),se()),!o)return;let n=s.colorMode||"teacher",a=s.scheduledClasses.filter(i=>r==="teacher"?i.teacherId===o:r==="group"?i.groupId===o:!1).map(i=>{let u=s.subjects.find(x=>x.id===i.subjectId),p=s.teachers.find(x=>x.id===i.teacherId),b=s.courses.find(x=>x.groups.some(v=>v.id===i.groupId)),m=b?b.groups.find(x=>x.id===i.groupId):null,h=i.isPinned?"\u{1F4CC} ":"",f=u?`${h}${u.name}`:"Clase API",g=r==="group"?p?`Prof: ${p.name}`:"":b&&m?`${b.name} - G.${m.name}`:p?`Prof: ${p.name}`:"",y=n==="subject"?A(i.subjectId):p?p.color:"#4f46e5";return{id:i.id,calendarId:i.teacherId,title:f,body:g,start:i.start,end:i.end,isReadOnly:i.isPinned||!1,backgroundColor:y,color:"#ffffff",customStyle:{borderRadius:"6px",border:"none",padding:"2px"}}});s.calendarInstance&&s.calendarInstance.createEvents(a);let d=document.getElementById("teacher-summary-card"),c=document.getElementById("teacher-summary-content");if(r==="teacher"&&o){let i=s.teachers.find(u=>u.id===o);if(i&&d&&c){let u=s.scheduledClasses.filter(g=>g.teacherId===o),p=u.reduce((g,y)=>g+y.duration,0),b=new Map;u.forEach(g=>{let y=s.subjects.find(S=>S.id===g.subjectId),x=s.courses.find(S=>S.groups.some(Le=>Le.id===g.groupId)),v=x?x.groups.find(S=>S.id===g.groupId):null,I=x?x.name:"Curso",C=v?v.name:"Grupo",D=y?y.name:"Asignatura",w=`${I}_${C}_${D}`;b.has(w)||b.set(w,{courseName:I,groupName:C,subjectName:D,hours:0}),b.get(w).hours+=g.duration});let m=i.maxHours||(s.config?Math.round(s.config.minutosMaximosProfesor/60):25),h=Array.from(b.values()),f=`
                <div class="flex flex-wrap items-center justify-between gap-4 mb-3 border-b border-gray-100 pb-2">
                    <div class="flex items-center gap-2">
                        <span class="w-3.5 h-3.5 rounded-full shadow-sm" style="background-color: ${i.color};"></span>
                        <h4 class="font-bold text-gray-800 text-sm">Resumen Docente: ${i.name}</h4>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500 font-medium">Carga Lectiva Asignada:</span>
                        <span class="text-xs font-bold px-2.5 py-1 ${p<=m?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-amber-50 text-amber-700 border border-amber-200"} rounded-full">
                            ${p.toFixed(1)}h / ${m}h max
                        </span>
                    </div>
                </div>
            `;h.length===0?f+='<p class="text-xs text-gray-400 italic">No tiene clases asignadas en el horario actual.</p>':(f+='<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">',h.forEach(g=>{f+=`
                        <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between hover:bg-slate-100 transition-colors">
                            <span class="text-xs font-bold text-slate-800 truncate">${g.courseName} - G.${g.groupName}</span>
                            <div class="flex justify-between items-center mt-1 text-[11px]">
                                <span class="text-indigo-600 font-semibold truncate">${g.subjectName}</span>
                                <span class="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">${g.hours.toFixed(1)}h</span>
                            </div>
                        </div>
                    `}),f+="</div>"),c.innerHTML=f,d.classList.remove("hidden")}}else d&&d.classList.add("hidden")}function Pe(t){let e=s.scheduledClasses.find(g=>g.id===t.id);if(!e)return;let r=s.subjects.find(g=>g.id===e.subjectId),o=s.teachers.find(g=>g.id===e.teacherId);if(!r||!o)return;let n=s.courses.find(g=>g.groups.some(y=>y.id===e.groupId)),a=n?n.groups.find(g=>g.id===e.groupId):null,d=n&&a?`${n.name} - Grupo ${a.name}`:"Sin grupo",c=document.getElementById("event-detail-title");c&&(c.textContent=r.name);let u=(s.colorMode||"teacher")==="subject"?A(e.subjectId):o.color,p=document.getElementById("event-detail-header");p&&(p.style.backgroundColor=u);let b=document.getElementById("event-detail-body");b&&(b.innerHTML=`
            <p class="text-sm mb-1.5">Curso/Grupo: <b>${d}</b></p>
            <p class="text-sm">Impartida por: <b>${o.name}</b></p>
        `);let m=document.getElementById("btn-pin-event");m&&(m.innerText=e.isPinned?"Desfijar":"Fijar (Pin)",m.onclick=async()=>{e.isPinned=!e.isPinned;try{await s.API.updateClass(e)}catch(g){console.error("Error al actualizar estado del pin:",g)}s.WS.sendCommand("PIN_UPDATE",{id:e.id,state:e.isPinned}),k(),E()});let h=document.getElementById("btn-delete-event");h&&(h.onclick=async()=>{await s.API.deleteClass(e.id),s.scheduledClasses=s.scheduledClasses.filter(g=>g.id!==e.id),s.WS.sendCommand("MANUAL_EDIT",{delete:e.id}),k(),E()});let f=document.getElementById("event-detail-modal");f&&(f.classList.replace("hidden","flex"),f.onclick=g=>{g.target===f&&k()})}function k(){let t=document.getElementById("event-detail-modal");t&&t.classList.replace("flex","hidden")}function oe(t,e){let r=t.getHours(),o=t.getMinutes(),n=e.getHours(),a=e.getMinutes(),d=r*60+o,c=n*60+a,i=720,u=30;if(s.config){let b=s.config.horaInicioRecreo.split(":");i=parseInt(b[0])*60+parseInt(b[1]),u=s.config.duracionRecreo}let p=i+u;return d<p&&c>i}function se(){if(!s.calendarInstance)return;let t=new Date,e=t.getDay(),r=t.getDate()-e+(e===0?-6:1),o=new Date(t);o.setDate(r),o.setHours(0,0,0,0);let n=12,a=0,d=30;if(s.config){let c=s.config.horaInicioRecreo.split(":");n=parseInt(c[0]),a=parseInt(c[1]),d=s.config.duracionRecreo}for(let c=0;c<5;c++){let i=new Date(o);i.setDate(o.getDate()+c);let u=new Date(i);u.setHours(n,a,0,0);let p=new Date(u);p.setMinutes(u.getMinutes()+d),s.calendarInstance.createEvents([{id:`recess-${c}`,calendarId:"recess",title:"\u2615 Recreo",start:u.toISOString(),end:p.toISOString(),isReadOnly:!0,isAllDay:!1,backgroundColor:"#f1f5f9",borderColor:"#94a3b8",color:"#64748b"}])}}async function ne(){let t=document.getElementById("view-type-select"),e=document.getElementById("view-entity-select");if(!t||!e)return;if(t.value!=="group"){l("Info","Por favor, selecciona la vista de 'Grupo' para vaciar un horario espec\xEDfico.","info");return}let r=e.value;if(!r){l("Info","No hay ning\xFAn grupo seleccionado.","info");return}let o=s.courses.flatMap(a=>a.groups).find(a=>a.id===r),n=o?o.name:"este grupo";if(confirm(`\xBFEst\xE1s seguro de que deseas vaciar todas las clases programadas para el grupo "${n}"?`))try{l("Limpiando...","Eliminando clases de la base de datos...","info"),await s.API.deleteGroupSchedule(r),s.scheduledClasses=s.scheduledClasses.filter(a=>a.groupId!==r),E(),l("\xC9xito","El horario del grupo se ha vaciado.","success"),s.WS.sendCommand("MANUAL_EDIT",{action:"cleared",groupId:r})}catch(a){console.error("Error clearing schedule:",a),l("Error","No se pudo limpiar el horario.","error")}}var je="",M=null,V="",J=null;function ae(t,e=null){je=t,M=e;let r=document.getElementById("crud-modal-title"),o=document.getElementById("crud-modal-body");if(!r||!o)return;if(t==="subject"){r.textContent=e?"Editar Asignatura":"Nueva Asignatura";let d=e?s.subjects.find(i=>i.id===e):null,c=s.currentCourseId;o.innerHTML=`
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Asignatura</label>
                    <input type="text" id="crud-subject-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${d?.name||""}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Horas Semanales</label>
                    <input type="number" id="crud-subject-hours" required min="0.5" step="0.5" class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${d?.hours||4}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Curso Asociado</label>
                    <select id="crud-subject-course" disabled required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none bg-gray-100 cursor-not-allowed">
                        ${s.courses.map(i=>`<option value="${i.id}" ${i.id===(d?.courseId||c)?"selected":""}>${i.name}</option>`).join("")}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Profesores Cualificados (Especialistas)</label>
                    <div class="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                        ${s.teachers.map(i=>{let u=d?.teachers?.includes(i.id)||!1;return`
                                <label class="flex items-center gap-2 cursor-pointer text-sm">
                                    <input type="checkbox" name="crud-subject-teachers" value="${i.id}" ${u?"checked":""} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                    <span>${i.name}</span>
                                </label>
                            `}).join("")}
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow animate-fade-in">Guardar</button>
                </div>
            </form>
        `}else if(t==="teacher"){r.textContent=e?"Editar Profesor":"Nuevo Profesor";let d=e?s.teachers.find(c=>c.id===e):null;o.innerHTML=`
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Profesor</label>
                    <input type="text" id="crud-teacher-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${d?.name||""}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Horas M\xE1ximas Semanales</label>
                    <input type="number" id="crud-teacher-max-hours" required min="0.5" step="0.5" class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${d?.maxHours||22.5}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Color Identificativo</label>
                    <div class="flex gap-2 items-center">
                        <input type="color" id="crud-teacher-color" required class="w-10 h-10 border border-gray-300 rounded cursor-pointer" value="${d?.color||"#4f46e5"}">
                        <span class="text-xs text-gray-500">Color visual en el calendario.</span>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Especialidades (Materias habilitadas)</label>
                    <div class="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                        ${s.subjects.map(c=>`
                            <label class="flex items-center gap-2 cursor-pointer text-sm">
                                <input type="checkbox" name="crud-teacher-subjects" value="${c.id}" ${d?.subjects.includes(c.id)?"checked":""} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                <span>${c.name}</span>
                            </label>
                        `).join("")}
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
                </div>
            </form>
        `}else if(t==="course"){r.textContent=e?"Editar Curso":"Nuevo Curso";let d=e?s.courses.find(c=>c.id===e):null;o.innerHTML=`
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Curso</label>
                    <input type="text" id="crud-course-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${d?.name||""}">
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
                </div>
            </form>
        `}let n=document.getElementById("crud-modal");n&&n.classList.replace("hidden","flex");let a=document.getElementById("form-crud");a&&(a.onsubmit=async d=>{if(d.preventDefault(),t==="subject"){let c=document.getElementById("crud-subject-name").value,i=parseFloat(document.getElementById("crud-subject-hours").value),u=s.currentCourseId,p=document.querySelectorAll('input[name="crud-subject-teachers"]:checked'),b=Array.from(p).map(m=>m.value);try{await s.API.saveSubject({id:M||void 0,name:c,hours:i,courseId:u,teachers:b}),l("\xC9xito","Asignatura guardada correctamente","success"),L(),z()}catch{l("Error","No se pudo guardar la asignatura","error")}}else if(t==="teacher"){let c=document.getElementById("crud-teacher-name").value,i=parseFloat(document.getElementById("crud-teacher-max-hours").value),u=document.getElementById("crud-teacher-color").value,p=document.querySelectorAll('input[name="crud-teacher-subjects"]:checked'),b=Array.from(p).map(m=>m.value);try{let m=M?s.teachers.find(f=>f.id===M):null,h=m?m.availability:[];await s.API.saveTeacher({id:M||void 0,name:c,maxHours:i,color:u,subjects:b,availability:h}),l("\xC9xito","Profesor guardado correctamente","success"),L(),$()}catch{l("Error","No se pudo guardar el profesor","error")}}else if(t==="course"){let c=document.getElementById("crud-course-name").value;try{await s.API.saveCourse({id:M||void 0,name:c}),l("\xC9xito","Curso guardado correctamente","success"),L(),H()}catch{l("Error","No se pudo guardar el curso","error")}}})}function ie(t,e=null){V=t,J=e;let r=s.courses.find(i=>i.id===t);if(!r)return;let o=e?r.groups.find(i=>i.id===e):null,n=document.getElementById("crud-modal-title");n&&(n.textContent=e?"Editar Grupo":"Nuevo Grupo");let a=document.getElementById("crud-modal-body");if(!a)return;a.innerHTML=`
        <form id="form-group-crud" class="space-y-4">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Grupo (Letra/Identificador)</label>
                <input type="text" id="crud-group-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${o?.name||""}">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Tutor del Grupo</label>
                <select id="crud-group-tutor" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    ${s.teachers.map(i=>`<option value="${i.id}" ${o?.tutorId===i.id?"selected":""}>${i.name}</option>`).join("")}
                </select>
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
            </div>
        </form>
    `;let d=document.getElementById("crud-modal");d&&d.classList.replace("hidden","flex");let c=document.getElementById("form-group-crud");c&&(c.onsubmit=async i=>{i.preventDefault();let u=document.getElementById("crud-group-name").value,p=document.getElementById("crud-group-tutor").value;try{let b=s.courses.find(m=>m.id===V);if(!b)return;if(J){let m=b.groups.find(h=>h.id===J);m&&(m.name=u,m.tutorId=p)}else{let m={id:"temp-"+Date.now(),name:u,tutorId:p,assignments:{}};b.groups.push(m)}await s.API.updateCourseGroup(V,b.groups),l("\xC9xito","Grupo guardado correctamente","success"),L(),H()}catch{l("Error","No se pudo guardar el grupo","error")}})}function L(){let t=document.getElementById("crud-modal");t&&t.classList.replace("flex","hidden")}function de(t){s.currentCourseId=t,window.switchTab("subjects")}async function z(){try{s.subjects=await s.API.getSubjects(),s.courses=await s.API.getCourses();let t=s.currentCourseId,e=document.getElementById("view-subjects-title");if(e){let n=s.courses.find(a=>a.id===t);e.textContent=n?`Asignaturas de ${n.name}`:"Gesti\xF3n de Asignaturas"}let r=document.getElementById("table-subjects");if(!r)return;if(r.innerHTML="",!t){r.innerHTML='<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">Por favor, selecciona un curso primero.</td></tr>';return}let o=s.subjects.filter(n=>n.courseId===t);if(o.length===0){r.innerHTML='<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">No hay asignaturas en este curso.</td></tr>';return}o.forEach(n=>{r.innerHTML+=`
                <tr class="hover:bg-gray-50 border-b border-gray-100 text-sm">
                    <td class="p-4 font-medium text-gray-800">${n.name}</td>
                    <td class="p-4 text-center text-gray-600">${j(n.hours)} h</td>
                    <td class="p-4 text-center">
                        <button onclick="openFormModal('subject', '${n.id}')" class="text-indigo-600 hover:text-indigo-900 font-semibold mr-3">Editar</button>
                        <button onclick="deleteSubject('${n.id}')" class="text-red-600 hover:text-red-900 font-semibold">Eliminar</button>
                    </td>
                </tr>
            `})}catch(t){console.error(t),l("Error","No se pudieron cargar las asignaturas","error")}}async function ce(t){if(confirm("\xBFEst\xE1s seguro de que deseas eliminar esta asignatura?"))try{await s.API.deleteSubject(t),l("\xC9xito","Asignatura eliminada correctamente","success"),z()}catch{l("Error","No se pudo eliminar la asignatura","error")}}async function $(){try{s.teachers=await s.API.getTeachers();let t=document.getElementById("list-teachers");if(!t)return;t.innerHTML="",s.teachers.forEach(e=>{let r=e.subjects.map(o=>{let n=s.subjects.find(a=>a.id===o);return n?n.name:""}).filter(o=>o!=="").join(", ");t.innerHTML+=`
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold text-gray-800 text-lg">${e.name}</h3>
                            <span class="w-4 h-4 rounded-full border border-gray-300" style="background-color: ${e.color}"></span>
                        </div>
                        <p class="text-sm text-gray-500 mb-1">Max: <b>${j(e.maxHours)} h / semana</b></p>
                        <p class="text-xs text-gray-600 mt-2 italic truncate" title="${r||"Sin especialidades"}">
                            Especialidades: ${r||"Ninguna"}
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
                        <button onclick="openAvailabilityModal('${e.id}')" class="text-emerald-600 hover:text-emerald-800 text-xs font-semibold mr-auto flex items-center gap-1">\u{1F4C5} Disponibilidad</button>
                        <button onclick="openFormModal('teacher', '${e.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-semibold">Editar</button>
                        <button onclick="deleteTeacher('${e.id}')" class="text-red-600 hover:text-red-900 text-xs font-semibold">Eliminar</button>
                    </div>
                </div>
            `})}catch(t){console.error(t),l("Error","No se pudieron cargar los profesores","error")}}async function le(t){if(confirm("\xBFEst\xE1s seguro de que deseas eliminar este profesor?"))try{await s.API.deleteTeacher(t),l("\xC9xito","Profesor eliminado correctamente","success"),$()}catch{l("Error","No se pudo eliminar al profesor","error")}}async function H(){try{s.courses=await s.API.getCourses(),s.teachers=await s.API.getTeachers();let t=document.getElementById("list-courses");if(!t)return;t.innerHTML="",s.courses.forEach(e=>{let r="";e.groups.length===0?r='<p class="text-xs text-gray-400 italic">No hay grupos creados en este curso.</p>':r=`
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        ${e.groups.map(o=>{let n=s.teachers.find(a=>a.id===o.tutorId);return`
                                <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                                    <div>
                                        <h4 class="font-semibold text-gray-700 text-sm">Grupo ${o.name}</h4>
                                        <p class="text-xs text-gray-500">Tutor: ${n?n.name:"Sin asignar"}</p>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="openGroupModal('${e.id}', '${o.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold">Editar</button>
                                        <button onclick="deleteGroup('${e.id}', '${o.id}')" class="text-red-600 hover:text-red-900 text-xs font-bold">Borrar</button>
                                    </div>
                                </div>
                            `}).join("")}
                    </div>
                `,t.innerHTML+=`
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
                    <div class="flex items-center justify-between border-b pb-2">
                        <h3 class="font-bold text-gray-800 text-lg">${e.name}</h3>
                        <div class="flex gap-3">
                            <button onclick="openCourseSubjects('${e.id}')" class="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1">\u{1F4DA} Asignaturas</button>
                            <button onclick="openGroupModal('${e.id}')" class="text-emerald-600 hover:text-emerald-800 text-xs font-bold">+ A\xF1adir Grupo</button>
                            <button onclick="openFormModal('course', '${e.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold">Editar Curso</button>
                            <button onclick="deleteCourse('${e.id}')" class="text-red-600 hover:text-red-900 text-xs font-bold">Eliminar Curso</button>
                        </div>
                    </div>
                    ${r}
                </div>
            `})}catch(t){console.error(t),l("Error","No se pudieron cargar los cursos","error")}}async function ue(t){if(confirm("\xBFEst\xE1s seguro de que deseas eliminar este curso y todos sus grupos?"))try{await s.API.deleteCourse(t),l("\xC9xito","Curso eliminado correctamente","success"),H()}catch{l("Error","No se pudo eliminar el curso","error")}}async function me(t,e){if(confirm("\xBFEst\xE1s seguro de que deseas eliminar este grupo?"))try{let r=s.courses.find(n=>n.id===t);if(!r)return;let o=r.groups.filter(n=>n.id!==e);await s.API.updateCourseGroup(t,o),l("\xC9xito","Grupo eliminado correctamente","success"),H()}catch{l("Error","No se pudo eliminar el grupo","error")}}async function pe(){let t=document.getElementById("assignments-list");if(t){t.innerHTML="";try{if(s.courses=await s.API.getCourses(),s.subjects=await s.API.getSubjects(),s.teachers=await s.API.getTeachers(),s.courses.length===0){t.innerHTML='<div class="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 italic">No hay asignaciones cargadas. Cree cursos y grupos primero.</div>';return}s.courses.forEach(e=>{let r=s.subjects.filter(n=>n.courseId===e.id);if(e.groups.length===0)return;let o="";e.groups.forEach(n=>{let a="";r.length===0?a='<p class="text-xs text-gray-400 italic py-2">No hay asignaturas en este curso.</p>':r.forEach(d=>{let c=n.assignments[d.id]||"",i=s.teachers.filter(u=>u.subjects.includes(d.id));a+=`
                            <div class="flex flex-col gap-1.5 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                                <span class="text-sm font-semibold text-gray-700 truncate block" title="${d.name}">${d.name} (${j(d.hours)}h)</span>
                                <select onchange="updateAssignment('${e.id}', '${n.id}', '${d.id}', this.value)" class="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white hover:border-slate-400 focus:border-indigo-500 outline-none transition-colors">
                                    <option value="">-- Sin asignar --</option>
                                    ${s.teachers.map(u=>{let b=i.some(m=>m.id===u.id)?u.name:`${u.name} (No especialista)`;return`<option value="${u.id}" ${c===u.id?"selected":""}>${b}</option>`}).join("")}
                                </select>
                            </div>
                        `}),o+=`
                    <div id="group-card-${e.id}-${n.id}" class="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
                        <div class="flex items-center justify-between border-b pb-2">
                            <h4 class="font-bold text-gray-800 text-sm">Grupo ${n.name}</h4>
                            <button onclick="clearGroupAssignments('${e.id}', '${n.id}')" class="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-0.5" title="Poner todas las asignaturas de este grupo sin asignar">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                Vaciar Grupo
                            </button>
                        </div>
                        <div class="space-y-3">
                            ${a}
                        </div>
                    </div>
                `}),t.innerHTML+=`
                <div id="course-card-${e.id}" class="mb-8 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <div class="flex items-center justify-between border-b pb-2">
                        <h3 class="font-bold text-gray-800 text-lg">${e.name}</h3>
                        <button onclick="clearCourseAssignments('${e.id}')" class="text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200 transition-colors" title="Poner todas las asignaciones de todos los grupos de este curso sin asignar">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            Vaciar Curso
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${o}
                    </div>
                </div>
            `})}catch(e){console.error(e),l("Error","No se pudieron cargar las asignaciones","error")}}}async function ge(t,e,r,o){try{let n=s.courses.find(d=>d.id===t);if(!n)return;let a=n.groups.find(d=>d.id===e);if(!a)return;o===""?delete a.assignments[r]:a.assignments[r]=o,await s.API.updateCourseGroup(t,n.groups),l("\xC9xito","Asignaci\xF3n actualizada","success")}catch{l("Error","No se pudo guardar la asignaci\xF3n","error")}}async function fe(t,e){try{let r=s.courses.find(a=>a.id===t);if(!r)return;let o=r.groups.find(a=>a.id===e);if(!o||!confirm(`\xBFEst\xE1s seguro de que deseas poner todas las asignaturas del grupo "${o.name}" sin asignar?`))return;o.assignments={},await s.API.updateCourseGroup(t,r.groups);let n=document.getElementById(`group-card-${t}-${e}`);n&&n.querySelectorAll("select").forEach(d=>{d.value=""}),l("\xC9xito","Todas las asignaturas del grupo han sido puestas sin asignar","success")}catch{l("Error","No se pudo limpiar las asignaciones del grupo","error")}}async function be(t){try{let e=s.courses.find(o=>o.id===t);if(!e||!confirm(`\xBFEst\xE1s seguro de que deseas poner todas las asignaturas de TODOS los grupos del curso "${e.name}" sin asignar?`))return;e.groups.forEach(o=>{o.assignments={}}),await s.API.updateCourseGroup(t,e.groups);let r=document.getElementById(`course-card-${t}`);r&&r.querySelectorAll("select").forEach(n=>{n.value=""}),l("\xC9xito","Todas las asignaturas del curso han sido puestas sin asignar","success")}catch{l("Error","No se pudo limpiar las asignaciones del curso","error")}}var K=null,P=[];function he(t){let e=s.teachers.find(d=>d.id===t);if(!e)return;K=t,P=e.availability?[...e.availability]:[];let r=document.getElementById("availability-teacher-name");r&&(r.textContent=e.name);let o=document.getElementById("availability-grid-body");if(!o)return;o.innerHTML="",[{start:"09:00",end:"09:30"},{start:"09:30",end:"10:00"},{start:"10:00",end:"10:30"},{start:"10:30",end:"11:00"},{start:"11:00",end:"11:30"},{start:"11:30",end:"12:00"},{start:"12:30",end:"13:00"},{start:"13:00",end:"13:30"},{start:"13:30",end:"14:00"}].forEach((d,c)=>{let i="";for(let u=1;u<=5;u++){let p=P.some(f=>f.dayOfWeek===u&&f.startTime===d.start&&f.endTime===d.end),b=`cell-av-${u}-${c}`,m=p?"bg-red-500 hover:bg-red-600 text-white border-red-300 font-bold":"bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200",h=p?"NO DISPONIBLE":"DISPONIBLE";i+=`
                <td class="p-2 text-center border border-gray-200">
                    <button type="button" id="${b}" 
                        onclick="toggleAvailabilitySlot(${u}, '${d.start}', '${d.end}', '${b}')"
                        class="w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all ${m}">
                        ${h}
                    </button>
                </td>
            `}o.innerHTML+=`
            <tr class="hover:bg-gray-50">
                <td class="p-3 border border-gray-200 font-semibold text-gray-700 text-center">${d.start} - ${d.end}</td>
                ${i}
            </tr>
        `});let a=document.getElementById("availability-modal");a&&a.classList.replace("hidden","flex")}function xe(t,e,r,o){let n=document.getElementById(o);if(!n)return;let a=P.findIndex(d=>d.dayOfWeek===t&&d.startTime===e&&d.endTime===r);a>-1?(P.splice(a,1),n.className="w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200",n.textContent="DISPONIBLE"):(P.push({dayOfWeek:t,startTime:e,endTime:r}),n.className="w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all bg-red-500 hover:bg-red-600 text-white border border-red-300 font-bold",n.textContent="NO DISPONIBLE")}function Q(){let t=document.getElementById("availability-modal");t&&t.classList.replace("flex","hidden")}async function ye(){if(!K)return;let t=s.teachers.find(e=>e.id===K);if(t){t.availability=P;try{await s.API.saveTeacher(t),l("\xC9xito","Disponibilidad docente guardada correctamente","success"),Q(),$()}catch{l("Error","No se pudo guardar la disponibilidad","error")}}}function ve(){let t=s.config;if(!t)return;let e=document.getElementById("settings-tiempo-minimo"),r=document.getElementById("settings-tiempo-maximo"),o=document.getElementById("settings-max-minutos-profesor"),n=document.getElementById("settings-priorizar-tutor"),a=document.getElementById("settings-priorizar-tutor-puntos"),d=document.getElementById("settings-bloques-60-puntos"),c=document.getElementById("settings-minimizar-asignaturas"),i=document.getElementById("settings-minimizar-asignaturas-puntos"),u=document.getElementById("settings-limite-tiempo"),p=document.getElementById("settings-tiempo-estancamiento"),b=document.getElementById("settings-hora-inicio"),m=document.getElementById("settings-hora-fin"),h=document.getElementById("settings-recreo-inicio"),f=document.getElementById("settings-recreo-duracion"),g=document.getElementById("settings-respetar-especialidad"),y=document.getElementById("settings-respetar-limite-horas"),x=document.getElementById("settings-respetar-disponibilidad");if(e&&(e.value=t.tiempoMinimo.toString()),r&&(r.value=t.tiempoMaximo.toString()),o&&(o.value=t.minutosMaximosProfesor.toString()),n){n.checked=t.priorizarTutor;let v=document.getElementById("settings-tutor-points-container");v&&(v.style.display=t.priorizarTutor?"flex":"none"),n.onchange=()=>{v&&(v.style.display=n.checked?"flex":"none")}}if(a&&(a.value=t.priorizarTutorPuntos.toString()),d&&(d.value=t.fomentarBloques60Puntos.toString()),c){c.checked=t.minimizarAsignaturasDistintas??!0;let v=document.getElementById("settings-minimizar-asignaturas-points-container");v&&(v.style.display=c.checked?"flex":"none"),c.onchange=()=>{v&&(v.style.display=c.checked?"flex":"none")}}i&&(i.value=(t.minimizarAsignaturasPuntos??50).toString()),u&&(u.value=(t.limiteTiempoSegundos??18e3).toString()),p&&(p.value=(t.tiempoEstancamientoSegundos??60).toString()),b&&(b.value=t.horaInicioClases),m&&(m.value=t.horaFinClases),h&&(h.value=t.horaInicioRecreo),f&&(f.value=t.duracionRecreo.toString()),g&&(g.checked=t.respetarEspecialidad),y&&(y.checked=t.respetarLimiteHoras),x&&(x.checked=t.respetarDisponibilidad)}async function Ee(){let t=document.getElementById("settings-tiempo-minimo"),e=document.getElementById("settings-tiempo-maximo"),r=document.getElementById("settings-max-minutos-profesor"),o=document.getElementById("settings-priorizar-tutor"),n=document.getElementById("settings-priorizar-tutor-puntos"),a=document.getElementById("settings-bloques-60-puntos"),d=document.getElementById("settings-minimizar-asignaturas"),c=document.getElementById("settings-minimizar-asignaturas-puntos"),i=document.getElementById("settings-limite-tiempo"),u=document.getElementById("settings-tiempo-estancamiento"),p=document.getElementById("settings-hora-inicio"),b=document.getElementById("settings-hora-fin"),m=document.getElementById("settings-recreo-inicio"),h=document.getElementById("settings-recreo-duracion"),f=document.getElementById("settings-respetar-especialidad"),g=document.getElementById("settings-respetar-limite-horas"),y=document.getElementById("settings-respetar-disponibilidad"),x={priorizarTutor:o?o.checked:!1,tiempoMinimo:t?parseInt(t.value):30,tiempoMaximo:e?parseInt(e.value):60,minutosMaximosProfesor:r?parseInt(r.value):1500,priorizarTutorPuntos:n?parseInt(n.value):100,fomentarBloques60Puntos:a?parseInt(a.value):10,minimizarAsignaturasDistintas:d?d.checked:!0,minimizarAsignaturasPuntos:c?parseInt(c.value):50,limiteTiempoSegundos:i?parseFloat(i.value):18e3,tiempoEstancamientoSegundos:u?parseFloat(u.value):60,horaInicioClases:p?p.value:"09:00",horaFinClases:b?b.value:"14:00",horaInicioRecreo:m?m.value:"12:00",duracionRecreo:h?parseInt(h.value):30,respetarEspecialidad:f?f.checked:!0,respetarLimiteHoras:g?g.checked:!0,respetarDisponibilidad:y?y.checked:!0};try{s.config=await s.API.saveConfig(x),l("\xC9xito","Configuraci\xF3n de reglas guardada correctamente","success")}catch{l("Error","No se pudo guardar la configuraci\xF3n","error")}}var O={ok:'<svg class="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',warning:'<svg class="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',error:'<svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'},Ie={ok:{bg:"bg-emerald-50",border:"border-emerald-200",text:"text-emerald-700"},warning:{bg:"bg-amber-50",border:"border-amber-200",text:"text-amber-700"},error:{bg:"bg-red-50",border:"border-red-200",text:"text-red-700"}};function Be(t){let e=Ie[t.status]||Ie.ok,r=t.details.length>0?`<ul class="mt-2 ml-6 space-y-0.5 text-xs ${e.text} opacity-80">${t.details.map(o=>`<li class="list-disc">${o}</li>`).join("")}</ul>`:"";return`
        <div class="flex items-start gap-3 p-3 rounded-lg ${e.bg} border ${e.border} transition-all duration-200">
            ${O[t.status]||O.ok}
            <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm ${e.text}">${t.name}</div>
                <div class="text-xs text-gray-600 mt-0.5">${t.message}</div>
                ${r}
            </div>
        </div>
    `}async function we(){let t=document.getElementById("prevalidation-modal"),e=document.getElementById("prevalidation-body"),r=document.getElementById("prevalidation-summary");if(!(!t||!e||!r)){t.classList.remove("hidden"),t.classList.add("flex"),e.innerHTML=`
        <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <span class="ml-3 text-gray-500 text-sm">Analizando viabilidad...</span>
        </div>
    `,r.innerHTML="";try{let o=await s.API.getPrevalidation(),n=o.checks.filter(i=>i.status==="error").length,a=o.checks.filter(i=>i.status==="warning").length,d=o.checks.filter(i=>i.status==="ok").length;o.viable?r.innerHTML=`
                <div class="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    ${O.ok}
                    <span class="text-emerald-700 font-bold text-sm">Viable \u2014 Todos los chequeos superados</span>
                    <span class="ml-auto text-xs text-emerald-600">${d} ok${a>0?`, ${a} avisos`:""}</span>
                </div>
            `:r.innerHTML=`
                <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    ${O.error}
                    <span class="text-red-700 font-bold text-sm">No viable \u2014 Hay ${n} error(es) que impiden generar un horario correcto</span>
                    <span class="ml-auto text-xs text-red-600">${n} errores, ${a} avisos</span>
                </div>
            `;let c=[...o.checks].sort((i,u)=>{let p={error:0,warning:1,ok:2};return(p[i.status]??2)-(p[u.status]??2)});e.innerHTML=c.map(Be).join("")}catch(o){e.innerHTML=`
            <div class="text-center py-8 text-red-500">
                <p class="font-bold">Error al ejecutar la pre-validaci\xF3n</p>
                <p class="text-sm text-gray-500 mt-1">${o}</p>
            </div>
        `}}}function Ce(){let t=document.getElementById("prevalidation-modal");t&&(t.classList.add("hidden"),t.classList.remove("flex"))}function Te(){if(!s.courses||s.courses.length===0){l("Info","No hay cursos ni grupos registrados para imprimir.","info");return}let t=document.getElementById("print-area");t||(t=document.createElement("div"),t.id="print-area",document.body.appendChild(t));let e=9,r=14,o=30;if(s.config){let u=s.config.horaInicioClases.split(":"),p=s.config.horaFinClases.split(":");e=parseInt(u[0]),r=parseInt(p[0]),o=s.config.tiempoMinimo||30}let n=[],a=e*60,d=r*60;for(;a<d;){let u=a+o,p=Math.floor(a/60).toString().padStart(2,"0"),b=(a%60).toString().padStart(2,"0"),m=Math.floor(u/60).toString().padStart(2,"0"),h=(u%60).toString().padStart(2,"0");n.push({startStr:`${p}:${b}`,endStr:`${m}:${h}`,startMin:a,endMin:u}),a=u}let c=[{id:1,name:"Lunes"},{id:2,name:"Martes"},{id:3,name:"Mi\xE9rcoles"},{id:4,name:"Jueves"},{id:5,name:"Viernes"}],i="";s.courses.forEach(u=>{u.groups.forEach(p=>{let b=s.scheduledClasses.filter(m=>m.groupId===p.id);i+=`
                <div class="print-page">
                    <div class="flex justify-between items-center mb-2 border-b-2 border-indigo-600 pb-1">
                        <div>
                            <h1 class="text-xl font-bold text-gray-900 leading-tight">${u.name} - Grupo ${p.name}</h1>
                            <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Horario Lectivo Oficial \u2022 EduSchedule</p>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">Clases: ${b.length}</span>
                        </div>
                    </div>

                    <table class="w-full border-collapse border border-gray-300 text-xs table-fixed">
                        <thead>
                            <tr class="bg-slate-800 text-white font-bold border-b border-gray-300">
                                <th class="p-1 border border-gray-300 w-20 text-center text-[10px]">Hora</th>
                                ${c.map(m=>`<th class="p-1 border border-gray-300 text-center text-[11px]">${m.name}</th>`).join("")}
                            </tr>
                        </thead>
                        <tbody>
            `,n.forEach(m=>{let h=!1;if(s.config){let f=s.config.horaInicioRecreo.split(":"),g=parseInt(f[0])*60+parseInt(f[1]),y=g+s.config.duracionRecreo;m.startMin>=g&&m.startMin<y&&(h=!0)}if(h){i+=`
                        <tr class="bg-gray-100 text-gray-500 font-semibold">
                            <td class="p-1 border border-gray-300 text-center font-mono text-[9px]">${m.startStr} - ${m.endStr}</td>
                            <td colspan="5" class="p-1 border border-gray-300 text-center bg-gray-100 text-slate-500 text-[10px]">\u2615 Recreo</td>
                        </tr>
                    `;return}i+="<tr>",i+=`<td class="p-1 border border-gray-300 text-center font-mono text-[9px] font-medium bg-gray-50">${m.startStr} - ${m.endStr}</td>`,c.forEach(f=>{let g=b.find(y=>{let x=new Date(y.start);return x.getDay()!==f.id?!1:x.getHours()*60+x.getMinutes()===m.startMin});if(g){let y=s.subjects.find(C=>C.id===g.subjectId),x=s.teachers.find(C=>C.id===g.teacherId),v=A(g.subjectId),I=g.isPinned?"\u{1F4CC} ":"";i+=`
                            <td class="p-1 border border-gray-300 align-top text-white font-medium shadow-inner" style="background-color: ${v} !important; color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
                                <div class="font-bold text-[10px] truncate leading-tight">${I}${y?y.name:"Clase"}</div>
                                ${x?`<div class="text-[9px] opacity-95 truncate leading-tight font-normal">Prof: ${x.name}</div>`:""}
                            </td>
                        `}else i+='<td class="p-1 border border-gray-300 text-center text-gray-300 bg-white text-[9px]">--</td>'}),i+="</tr>"}),i+=`
                        </tbody>
                    </table>
                </div>
            `})}),s.teachers.forEach(u=>{let p=s.scheduledClasses.filter(m=>m.teacherId===u.id),b=p.reduce((m,h)=>m+h.duration,0);i+=`
            <div class="print-page">
                <div class="flex justify-between items-center mb-2 border-b-2 border-indigo-600 pb-1">
                    <div>
                        <h1 class="text-xl font-bold text-gray-900 leading-tight">Horario Personal Docente: ${u.name}</h1>
                        <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Horario Individual \u2022 EduSchedule</p>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">Jornada: ${b.toFixed(1)}h</span>
                    </div>
                </div>

                <table class="w-full border-collapse border border-gray-300 text-xs table-fixed">
                    <thead>
                        <tr class="bg-slate-800 text-white font-bold border-b border-gray-300">
                            <th class="p-1 border border-gray-300 w-20 text-center text-[10px]">Hora</th>
                            ${c.map(m=>`<th class="p-1 border border-gray-300 text-center text-[11px]">${m.name}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
        `,n.forEach(m=>{let h=!1;if(s.config){let f=s.config.horaInicioRecreo.split(":"),g=parseInt(f[0])*60+parseInt(f[1]),y=g+s.config.duracionRecreo;m.startMin>=g&&m.startMin<y&&(h=!0)}if(h){i+=`
                    <tr class="bg-gray-100 text-gray-500 font-semibold">
                        <td class="p-1 border border-gray-300 text-center font-mono text-[9px]">${m.startStr} - ${m.endStr}</td>
                        <td colspan="5" class="p-1 border border-gray-300 text-center bg-gray-100 text-slate-500 text-[10px]">\u2615 Recreo</td>
                    </tr>
                `;return}i+="<tr>",i+=`<td class="p-1 border border-gray-300 text-center font-mono text-[9px] font-medium bg-gray-50">${m.startStr} - ${m.endStr}</td>`,c.forEach(f=>{let g=p.find(y=>{let x=new Date(y.start);return x.getDay()!==f.id?!1:x.getHours()*60+x.getMinutes()===m.startMin});if(g){let y=s.subjects.find(w=>w.id===g.subjectId),x=s.courses.find(w=>w.groups.some(S=>S.id===g.groupId)),v=x?x.groups.find(w=>w.id===g.groupId):null,I=x&&v?`${x.name} G.${v.name}`:"",C=A(g.subjectId),D=g.isPinned?"\u{1F4CC} ":"";i+=`
                        <td class="p-1 border border-gray-300 align-top text-white font-medium shadow-inner" style="background-color: ${C} !important; color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
                            <div class="font-bold text-[10px] truncate leading-tight">${D}${y?y.name:"Clase"}</div>
                            ${I?`<div class="text-[9px] opacity-95 truncate leading-tight font-normal">${I}</div>`:""}
                        </td>
                    `}else i+='<td class="p-1 border border-gray-300 text-center text-gray-300 bg-white text-[9px]">--</td>'}),i+="</tr>"}),i+=`
                    </tbody>
                </table>
            </div>
        `}),t.innerHTML=i,l("Imprimiendo","Preparando documento A4 Horizontal con horarios de grupos y profesores...","info"),setTimeout(()=>{window.print()},300)}var W="0.0.6",ke="guillemo12/Horarios-profesores";function Se(t){return t.replace(/^v/,"").trim().split(".").map(r=>parseInt(r,10)||0)}function Ae(t,e=W){let r=Se(t),o=Se(e),n=Math.max(r.length,o.length);for(let a=0;a<n;a++){let d=r[a]??0,c=o[a]??0;if(d>c)return!0;if(d<c)return!1}return!1}function De(t){if(!t||t.length===0)return null;let e=navigator.userAgent.includes("Windows")||navigator.platform.includes("Win"),r=navigator.userAgent.includes("Linux");if(e){let o=t.find(c=>c.name.endsWith("-setup.exe"));if(o)return o;let n=t.find(c=>c.name.includes("Unico")&&c.name.endsWith(".exe"));if(n)return n;let a=t.find(c=>c.name.endsWith(".exe"));if(a)return a;let d=t.find(c=>c.name.endsWith(".msi"));if(d)return d}if(r){let o=t.find(a=>a.name.endsWith(".AppImage"));if(o)return o;let n=t.find(a=>a.name.endsWith(".deb"));if(n)return n}return t[0]||null}async function X(t=!1){try{let e=await fetch(`https://api.github.com/repos/${ke}/releases/latest`,{headers:{Accept:"application/vnd.github.v3+json"}});if(!e.ok){t||l("Actualizaciones","No se encontr\xF3 ning\xFAn release publicado en GitHub.","warning");return}let r=await e.json();Ae(r.tag_name,W)?Ne(r):t||l("Actualizado",`EduSchedule est\xE1 al d\xEDa (v${W}).`,"success")}catch(e){console.error("Error al buscar actualizaciones:",e),t||l("Error","Error de red al consultar actualizaciones.","error")}}function Ne(t){let e=document.getElementById("modal-update-dialog");e||(e=document.createElement("div"),e.id="modal-update-dialog",e.className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4",document.body.appendChild(e));let r=De(t.assets);e.innerHTML=`
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden transition-all transform scale-100">
            <div class="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                        \u{1F680}
                    </div>
                    <div>
                        <h3 class="font-bold text-lg leading-tight">\xA1Nueva versi\xF3n disponible!</h3>
                        <p class="text-xs text-indigo-100 font-medium">v${W} \u2794 <span class="font-bold text-white">${t.tag_name}</span></p>
                    </div>
                </div>
                <button onclick="document.getElementById('modal-update-dialog')?.remove()" class="text-white/80 hover:text-white text-2xl leading-none font-bold cursor-pointer transition-colors">&times;</button>
            </div>
            
            <div class="p-6 space-y-4">
                <div>
                    <h4 class="font-semibold text-slate-800 text-sm mb-1.5">${t.name||t.tag_name}</h4>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 max-h-44 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">
                        ${t.body||"Se han incluido mejoras de rendimiento, estabilidad y nuevas funciones."}
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
                    <a href="${t.html_url}" target="_blank" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline flex items-center gap-1">
                        Ver notas completas en GitHub \u2197
                    </a>
                </div>
            </div>
        </div>
    `;let o=document.getElementById("btn-trigger-update");o&&r?o.addEventListener("click",async()=>{await Re(r,t)}):o&&o.addEventListener("click",()=>{window.open(t.html_url,"_blank")})}async function Re(t,e){let r=document.getElementById("update-action-container");if(r){r.innerHTML=`
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center space-y-3">
            <div class="flex items-center justify-center gap-3">
                <svg class="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="font-semibold text-xs text-indigo-900" id="update-status-text">Descargando actualizaci\xF3n (${t.name})...</span>
            </div>
            <div class="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden">
                <div class="bg-indigo-600 h-2 rounded-full animate-pulse w-full"></div>
            </div>
            <p class="text-[11px] text-indigo-600/80">Por favor, espere. El programa se reiniciar\xE1 autom\xE1ticamente al terminar.</p>
        </div>
    `;try{let o=await fetch("/api/v1/system/update/install",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({downloadUrl:t.browser_download_url,fileName:t.name})});if(o.ok){let n=document.getElementById("update-status-text");n&&(n.innerText="\xA1Descarga completa! Iniciando instalador..."),l("Actualizaci\xF3n","La aplicaci\xF3n se est\xE1 reiniciando con la nueva versi\xF3n.","success")}else throw new Error(`Servidor devolvi\xF3 status ${o.status}`)}catch(o){console.error("Error al ejecutar actualizaci\xF3n de un clic:",o),l("Error de actualizaci\xF3n","No se pudo actualizar autom\xE1ticamente. Abriendo descarga directa.","warning"),r.innerHTML=`
            <div class="space-y-2">
                <p class="text-xs text-rose-600 font-medium text-center">No se pudo completar autom\xE1ticamente. Puede descargar el instalador directamente:</p>
                <a href="${t.browser_download_url}" target="_blank" class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2">
                    \u2B07\uFE0F Descargar ${t.name}
                </a>
            </div>
        `}}}var s={API:new N,WS:new R,subjects:[],teachers:[],courses:[],scheduledClasses:[],calendarInstance:null,currentEventContext:null};s.currentCourseId=null;function Y(t,e,r="",o=0,n=""){fetch("/api/v1/log",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({level:t,message:e,source:r,line:o,stack:n??""})}).catch(()=>{})}window.onerror=(t,e,r,o,n)=>(Y("error",String(t),e??"",r??0,n?.stack??""),!1);window.addEventListener("unhandledrejection",t=>{let e=t.reason,r=e instanceof Error?e.message:String(e);Y("error",`Unhandled Promise Rejection: ${r}`,"",0,e?.stack??"")});var Ge=console.error.bind(console);console.error=(...t)=>{Ge(...t);let e=t.map(o=>o instanceof Error?o.message:String(o)).join(" "),r=t.find(o=>o instanceof Error)?.stack??"";Y("error",e,"console.error",0,r)};async function _e(t=15,e=1e3){let r=document.getElementById("loader-text");for(let o=1;o<=t;o++){try{if(r&&o>1&&(r.textContent=`Iniciando motor y servidor local... (${o}/${t})`),(await fetch("/api/v1/config",{cache:"no-store"})).ok)return!0}catch{}await new Promise(n=>setTimeout(n,e))}return!1}window.onload=async function(){try{if(!await _e())throw new Error("No se pudo conectar con el servidor Ktor tras varios intentos.");s.subjects=await s.API.getSubjects(),s.teachers=await s.API.getTeachers(),s.courses=await s.API.getCourses(),s.scheduledClasses=await s.API.getSchedule(),s.config=await s.API.getConfig();let e=document.getElementById("app-loader");e&&(e.style.opacity="0",setTimeout(()=>e.remove(),300)),ee(),q(),G(),s.WS.connect(),ze(),setTimeout(()=>{X(!0)},2e3)}catch(t){console.error("Init Error:",t);let e=document.getElementById("loader-text");e&&(e.textContent="Error conectando con la API local. Aseg\xFArese de que el servidor Ktor est\xE9 encendido.",e.className="mt-4 text-red-600 font-bold px-4 text-center")}};function ze(){let t=document.getElementById("btn-toggle-engine"),e=document.getElementById("ws-status");s.WS.on("connected",()=>{t&&(t.disabled=!1,t.classList.replace("bg-gray-400","bg-emerald-600"),t.classList.add("hover:bg-emerald-700"),t.classList.remove("cursor-not-allowed"));let r=document.getElementById("text-engine-btn");r&&(r.textContent="Generar (WS)"),e&&(e.innerHTML='<span class="relative flex h-2.5 w-2.5 mr-1.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span> Conectado')}),s.WS.on("disconnected",()=>{t&&(t.disabled=!0,t.classList.replace("bg-emerald-600","bg-gray-400"),t.classList.remove("hover:bg-emerald-700"),t.classList.add("cursor-not-allowed"));let r=document.getElementById("text-engine-btn");r&&(r.textContent="Conectando..."),e&&(e.innerHTML='<span class="relative flex h-2.5 w-2.5 mr-1.5"><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span> Desconectado')}),s.WS.on("scores_updated",r=>{let o=document.getElementById("score-hard"),n=document.getElementById("score-soft"),a=document.getElementById("score-soft-tooltip-text");if(o&&(o.textContent=r.hard.toString()),n){let p=r.porcentaje!==void 0&&!isNaN(r.porcentaje)?Math.min(100,Math.max(0,r.porcentaje)).toFixed(1)+"%":"0.0%";n.textContent=p}if(a){let p=r.rawObjective||r.soft||0,b=r.bound||0;a.innerHTML=`Puntos: <b class="text-white">${p.toLocaleString()}</b> / <b class="text-indigo-400">${b.toLocaleString()}</b> pts`}let d=document.getElementById("status-conflict"),c=document.getElementById("status-ok");d&&c&&(r.hard===0?(d.classList.replace("flex","hidden"),c.classList.replace("hidden","flex")):(c.classList.replace("flex","hidden"),d.classList.replace("hidden","flex")));let i=document.getElementById("conflict-tooltip-count"),u=document.getElementById("conflict-tooltip-list");if(i&&u){let p=r.conflictos||[];i.textContent=p.length.toString(),p.length===0?u.innerHTML='<span class="text-emerald-600 font-medium">\xA1Horario matem\xE1ticamente correcto!</span>':u.innerHTML='<ul class="list-disc pl-4 space-y-1 text-red-600 font-medium">'+p.map(b=>`<li>${b}</li>`).join("")+"</ul>"}}),s.WS.on("optimization_complete",()=>{Me(!0),l("\xA1Matem\xE1ticamente Correcto!","El servidor WS ha encontrado la disposici\xF3n perfecta.","success")}),s.WS.on("schedule_pushed",r=>{s.scheduledClasses=r,E()})}function Me(t=!1){try{let e=document.getElementById("btn-toggle-engine");if(!e)return;let r=document.getElementById("icon-stop"),o=document.getElementById("icon-play"),n=document.getElementById("text-engine-btn");s.WS.isOptimizing||t?(s.WS.sendCommand("STOP"),e.classList.replace("bg-red-600","bg-emerald-600"),e.classList.replace("hover:bg-red-700","hover:bg-emerald-700"),e.classList.remove("animate-pulse"),r&&r.classList.add("hidden"),o&&o.classList.remove("hidden"),n&&(n.textContent="Generar (WS)")):(s.WS.sendCommand("START"),e.classList.replace("bg-emerald-600","bg-red-600"),e.classList.replace("hover:bg-red-700","hover:bg-red-700"),e.classList.add("animate-pulse"),o&&o.classList.add("hidden"),r&&r.classList.remove("hidden"),n&&(n.textContent="Parar Motor"))}catch(e){console.error("Error in toggleOptimizationEngine:",e),l("Error","No se pudo iniciar el motor de optimizaci\xF3n","error")}}function Oe(t){document.querySelectorAll(".view-tab").forEach(n=>n.classList.remove("active"));let e=document.getElementById(`view-${t}`);e&&e.classList.add("active"),document.querySelectorAll(".nav-btn").forEach(n=>{n.classList.remove("bg-indigo-600","text-white","shadow-inner"),n.classList.add("text-slate-300")});let r=document.getElementById(`nav-${t}`);r&&(r.classList.remove("text-slate-300"),r.classList.add("bg-indigo-600","text-white","shadow-inner"));let o=document.getElementById("header-calendar");o&&(o.style.display=t==="calendar"?"flex":"none"),t==="subjects"&&z(),t==="teachers"&&$(),t==="courses"&&H(),t==="assignments"&&pe(),t==="settings"&&ve(),t==="calendar"&&setTimeout(()=>{s.calendarInstance&&s.calendarInstance.render(),q(),G()},50)}function q(){let t=document.getElementById("view-type-select"),e=document.getElementById("header-course-select"),r=document.getElementById("header-course-separator"),o=document.getElementById("view-entity-select");if(!t||!e||!o||!r)return;let n=t.value,a=e.value,d=o.value;n==="group"?(e.classList.remove("hidden"),r.classList.remove("hidden"),e.innerHTML="",s.courses.forEach(c=>e.innerHTML+=`<option value="${c.id}">${c.name}</option>`),a&&Array.from(e.options).some(c=>c.value===a)&&(e.value=a),U(d)):(e.classList.add("hidden"),r.classList.add("hidden"),o.innerHTML="",s.teachers.forEach(c=>o.innerHTML+=`<option value="${c.id}">${c.name}</option>`),d&&Array.from(o.options).some(c=>c.value===d)&&(o.value=d),E())}function We(){U(null)}async function qe(){try{l("Copia de Seguridad","Preparando archivo de base de datos...","info");let t=await fetch("/api/v1/system/database/export");if(!t.ok)throw new Error(`Error en el servidor: ${t.statusText}`);let e=await t.blob(),r=t.headers.get("Content-Disposition"),o=`EduSchedule_Backup_${new Date().toISOString().split("T")[0]}.db`;if(r&&r.includes("filename=")){let d=r.match(/filename="?([^"]+)"?/);d&&d[1]&&(o=d[1])}let n=window.URL.createObjectURL(e),a=document.createElement("a");a.href=n,a.download=o,document.body.appendChild(a),a.click(),window.URL.revokeObjectURL(n),a.remove(),l("Copia de Seguridad",`Base de datos exportada: ${o}`,"success")}catch(t){console.error("Error al exportar base de datos:",t),l("Error",`No se pudo exportar la base de datos: ${t.message}`,"error")}}async function Ue(t){if(!t.files||t.files.length===0)return;let e=t.files[0];if(t.value="",!e.name.endsWith(".db")&&!e.name.endsWith(".sqlite")){l("Archivo no v\xE1lido","Por favor selecciona un archivo .db o .sqlite v\xE1lido.","warning");return}if(confirm(`\xBFEst\xE1s seguro de que deseas restaurar la copia de seguridad "${e.name}"?

Esta acci\xF3n reemplazar\xE1 la base de datos actual y actualizar\xE1 toda la informaci\xF3n.`))try{l("Restaurando","Validando e importando base de datos...","info");let o=new FormData;o.append("file",e);let n=await fetch("/api/v1/system/database/import",{method:"POST",body:o}),a=await n.json();if(n.ok&&a.success)l("Restauraci\xF3n Completada","La base de datos se ha restaurado con \xE9xito. Actualizando vista...","success"),await loadAllData(),E(),q();else throw new Error(a.message||"Error desconocido al importar.")}catch(o){console.error("Error al restaurar base de datos:",o),l("Error de Restauraci\xF3n",`No se pudo restaurar la base de datos: ${o.message}`,"error")}}Object.assign(window,{AppData:s,switchTab:Oe,updateEntitySelector:q,onHeaderCourseChange:We,toggleOptimizationEngine:Me,openFormModal:ae,closeCrudModal:L,openGroupModal:ie,deleteSubject:ce,deleteTeacher:le,deleteCourse:ue,deleteGroup:me,updateAssignment:ge,saveNewClass:te,closeAddClassModal:_,openAddClassModal:F,onModalCourseChange:B,closeEventDetail:k,refreshCalendarView:E,updateDateRange:G,showToast:l,openCourseSubjects:de,openAvailabilityModal:he,closeAvailabilityModal:Q,saveAvailability:ye,saveSettings:Ee,clearGroupSchedule:ne,clearGroupAssignments:fe,clearCourseAssignments:be,toggleAvailabilitySlot:xe,runPrevalidation:we,closePrevalidation:Ce,toggleColorMode:re,printAllSchedules:Te,checkForUpdates:X,exportDatabase:qe,handleImportDatabaseFile:Ue});})();
//# sourceMappingURL=Datos.js.map
