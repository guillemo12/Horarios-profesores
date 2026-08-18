(()=>{var Ne=Object.defineProperty;var Re=(t,e,r)=>e in t?Ne(t,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):t[e]=r;var B=(t,e,r)=>Re(t,typeof e!="symbol"?e+"":e,r);var q=class{constructor(){B(this,"baseUrl");this.baseUrl="/api/v1"}async _fetch(e,r="GET",n=null){let o=`${this.baseUrl}/${e}`,i={method:r,headers:{"Content-Type":"application/json"}};n&&(i.body=JSON.stringify(n));let l=await fetch(o,i);if(!l.ok)throw new Error(`HTTP error! status: ${l.status}`);return r==="DELETE"?{success:!0}:await l.json()}async getConfig(){return this._fetch("config")}async saveConfig(e){return this._fetch("config","PUT",e)}async getSubjects(){return this._fetch("subjects")}async saveSubject(e){return e.id?this._fetch("subjects","PUT",e):this._fetch("subjects","POST",e)}async deleteSubject(e){return this._fetch(`subjects/${e}`,"DELETE")}async getTeachers(){return this._fetch("teachers")}async saveTeacher(e){return e.id?this._fetch("teachers","PUT",e):this._fetch("teachers","POST",e)}async deleteTeacher(e){return this._fetch(`teachers/${e}`,"DELETE")}async getCourses(){return this._fetch("courses")}async saveCourse(e){return e.id?this._fetch("courses","PUT",e):this._fetch("courses","POST",e)}async deleteCourse(e){return this._fetch(`courses/${e}`,"DELETE")}async updateCourseGroup(e,r){return this._fetch(`courses/${e}/groups`,"PUT",r)}async getSchedule(){return this._fetch("scheduledClasses")}async saveClass(e){return this._fetch("scheduledClasses","POST",e)}async updateClass(e){return this._fetch("scheduledClasses","PUT",e)}async deleteClass(e){return this._fetch(`scheduledClasses/${e}`,"DELETE")}async deleteGroupSchedule(e){return this._fetch(`scheduledClasses/group/${e}`,"DELETE")}async getPrevalidation(){return this._fetch("prevalidation")}};function m(t,e,r="info"){let n=document.getElementById("toast-container");if(!n)return;let o=document.createElement("div"),i=r==="error"?"border-red-500 text-red-500":r==="success"?"border-green-500 text-green-500":r==="warning"?"border-yellow-500 text-yellow-500":"border-blue-500 text-blue-500";o.className=`bg-white border-l-4 ${i} shadow-lg rounded-r-lg p-4 w-80 transform transition-all duration-300 translate-y-4 opacity-0 flex gap-3`,o.innerHTML=`<div><h4 class="text-sm font-bold text-gray-800">${t}</h4><p class="text-xs text-gray-600 mt-1">${e}</p></div>`,n.appendChild(o),setTimeout(()=>o.classList.remove("translate-y-4","opacity-0"),10),setTimeout(()=>{o.classList.add("opacity-0","translate-x-full"),setTimeout(()=>o.remove(),300)},4e3)}function k(t){return Number(t.toFixed(2)).toString()}var F=class{constructor(){B(this,"isConnected");B(this,"isOptimizing");B(this,"wsUrl");B(this,"callbacks");B(this,"socket");this.wsUrl=(window.location.protocol==="https:"?"wss://":"ws://")+window.location.host+"/ws",this.isConnected=!1,this.isOptimizing=!1,this.callbacks={},this.socket=null}connect(){this.socket=new WebSocket(this.wsUrl),this.socket.onopen=()=>{this.isConnected=!0,this._trigger("connected")},this.socket.onclose=()=>{this.isConnected=!1,this._trigger("disconnected"),setTimeout(()=>this.connect(),5e3)},this.socket.onerror=e=>{console.error("WebSocket error:",e)},this.socket.onmessage=e=>{try{let r=JSON.parse(e.data);r.type==="scores_updated"?this._trigger("scores_updated",r):r.type==="schedule_pushed"?this._trigger("schedule_pushed",r.schedule):r.type==="optimization_complete"?this._trigger("optimization_complete"):r.type==="optimization_stopped"&&(this.isOptimizing=!1)}catch(r){console.error("Error parsing WS message:",r)}}}on(e,r){this.callbacks[e]=r}_trigger(e,r){this.callbacks[e]&&this.callbacks[e](r)}sendCommand(e,r={}){try{if(!this.isConnected||!this.socket){m("Error","WebSocket Desconectado","error");return}this.socket.send(JSON.stringify({command:e,payload:r})),e==="START"?(this.isOptimizing=!0,m("Motor Iniciado","Servidor analizando el \xE1rbol de posibilidades (WS)...","info")):e==="STOP"&&(this.isOptimizing=!1,m("Motor Pausado","Optimizaci\xF3n detenida.","warning"))}catch(n){throw console.error("Error sending WS command:",n),m("Error de Comunicaci\xF3n","No se pudo enviar el comando al servidor","error"),n}}};function V(){if(!s.calendarInstance)return;let t=s.calendarInstance.getDateRangeStart(),e=s.calendarInstance.getDateRangeEnd(),r=o=>{let i=typeof o.toDate=="function"?o.toDate():new Date(o),l=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];return`${i.getDate()} ${l[i.getMonth()]}`},n=document.getElementById("calendar-date-range");n&&(n.textContent=`${r(t)} - ${r(e)}`)}function Z(t=null){let e=document.getElementById("header-course-select"),r=document.getElementById("view-entity-select");if(!e||!r)return;let n=e.value;r.innerHTML="";let o=s.courses.find(i=>i.id===n);o&&(o.groups.length===0?r.innerHTML='<option value="">Sin grupos</option>':o.groups.forEach(i=>r.innerHTML+=`<option value="${i.id}">Grupo ${i.name}</option>`)),t&&Array.from(r.options).some(i=>i.value===t)&&(r.value=t),L()}function le(){if(typeof tui>"u")return;let t=tui.Calendar;s.calendarInstance=new t("#calendar",{defaultView:"week",useFormPopup:!1,useDetailPopup:!1,week:{taskView:!1,eventView:["time"],dayNames:["Dom","Lunes","Martes","Mi\xE9rcoles","Jueves","Viernes","S\xE1b"],workweek:!0,hourStart:8,hourEnd:15},calendars:[{id:"default",name:"Clases",backgroundColor:"#4f46e5"},{id:"pinned",name:"Fijadas",backgroundColor:"#059669"},{id:"recess",name:"Recreo",backgroundColor:"#f1f5f9",borderColor:"#94a3b8",color:"#64748b"}],template:{weekDayName(e){return`<span class="toastui-calendar-day-name-item">${e.dayName}</span>`},time(e){return e.calendarId==="recess"?'<div class="p-1 font-semibold text-slate-500 text-xs">\u2615 Recreo</div>':`
                    <div class="p-1 flex flex-col justify-center h-full overflow-hidden text-white leading-tight">
                        <div class="font-bold text-xs truncate">${e.title}</div>
                        ${e.body?`<div class="text-[11px] font-medium opacity-90 truncate mt-0.5">${e.body}</div>`:""}
                    </div>
                `}}}),ge(),s.calendarInstance.on("selectDateTime",function(e){s.calendarInstance.clearGridSelections();let r=typeof e.start.toDate=="function"?e.start.toDate():new Date(e.start),n=typeof e.end.toDate=="function"?e.end.toDate():new Date(e.end);ee(r,n)}),s.calendarInstance.on("beforeUpdateEvent",async function(e){let{event:r,changes:n}=e,o=s.currentMergedEvents?.find(a=>a.id===r.id||a.mergedIds&&a.mergedIds.includes(r.id)),i=[];if(o&&o.mergedIds)i=s.scheduledClasses.filter(a=>o.mergedIds.includes(a.id));else{let a=s.scheduledClasses.find(u=>u.id===r.id);a&&(i=[a])}if(i.length===0)return;if(i.some(a=>a.isPinned)){m("Bloqueado","No puedes mover ni alterar una clase que est\xE1 fijada (Pin).","warning");return}let l=o?o.start:i[0].start,c=o?o.end:i[i.length-1].end;if(n.start&&(l=typeof n.start.toDate=="function"?n.start.toDate():new Date(n.start)),n.end&&(c=typeof n.end.toDate=="function"?n.end.toDate():new Date(n.end)),re(new Date(l),new Date(c))){m("Error","No se puede programar una clase durante el recreo (12:00 - 12:30).","error"),L();return}let d=new Date(l);if(m("Sincronizando...","Guardando nueva posici\xF3n en el servidor...","info"),i.length===2){let a=i[0];a.start=d.toISOString();let u=new Date(d.getTime()+30*6e4);a.end=u.toISOString(),a.duration=.5,await s.API.updateClass(a),s.WS.sendCommand("MANUAL_EDIT",{id:a.id,action:"moved"});let p=i[1];p.start=u.toISOString();let h=new Date(d.getTime()+60*6e4);p.end=h.toISOString(),p.duration=.5,await s.API.updateClass(p),s.WS.sendCommand("MANUAL_EDIT",{id:p.id,action:"moved"})}else{let a=i[0];a.start=d.toISOString();let u=new Date(c);a.end=u.toISOString(),a.duration=(u.getTime()-d.getTime())/(1e3*60*60),await s.API.updateClass(a),s.WS.sendCommand("MANUAL_EDIT",{id:a.id,action:"moved"})}L()}),s.calendarInstance.on("clickEvent",e=>te(e.event))}function ee(t=null,e=null){if(!t){let f=new Date,y=f.getDate()-f.getDay()+(f.getDay()===0?-6:1);t=new Date(f.setDate(y)),t.setHours(9,0,0,0),e=new Date(t),e.setHours(10,0,0,0)}let r=f=>f.toTimeString().slice(0,5);document.getElementById("modal-class-start").value=t.toISOString(),document.getElementById("modal-class-end").value=e.toISOString(),document.getElementById("modal-time-start").value=r(t),document.getElementById("modal-time-end").value=r(e);let n=document.getElementById("view-type-select"),o=document.getElementById("header-course-select"),i=document.getElementById("view-entity-select"),l=n?.value,c=o?.value,d=i?.value,a=document.getElementById("modal-subject"),u=document.getElementById("modal-course"),p=document.getElementById("modal-group"),h=document.getElementById("modal-teacher");if(a.innerHTML=s.subjects.map(f=>{let y=s.courses.find(x=>x.subjects.includes(f.id)),E=y?` (${y.name})`:"";return`<option value="${f.id}">${f.name}${E}</option>`}).join(""),u.innerHTML=s.courses.map(f=>`<option value="${f.id}">${f.name}</option>`).join(""),h.innerHTML=s.teachers.map(f=>`<option value="${f.id}">${f.name}</option>`).join(""),u.disabled=!1,p.disabled=!1,h.disabled=!1,l==="group"&&c)u.value=c,u.disabled=!0,W(),d&&(p.value=d,p.disabled=!0);else if(l==="teacher"&&d){h.value=d,h.disabled=!0,W();let f=s.teachers.find(y=>y.id===d);f&&f.subjects&&f.subjects.length>0&&(a.value=f.subjects[0])}else W();let b=document.getElementById("add-class-modal");b&&(b.classList.replace("hidden","flex"),b.onclick=f=>{f.target===b&&J()})}function W(){let t=document.getElementById("modal-course").value,e=document.getElementById("modal-group");e.innerHTML="";let r=s.courses.find(n=>n.id===t);r&&r.groups.length>0?r.groups.forEach(n=>{e.innerHTML+=`<option value="${n.id}">Grupo ${n.name}</option>`}):e.innerHTML='<option value="">(Sin grupos)</option>'}function J(){let t=document.getElementById("add-class-modal");t&&t.classList.replace("flex","hidden")}async function ue(){let t=document.getElementById("modal-class-start").value,e=document.getElementById("modal-class-end").value,r=new Date(t),n=new Date(e),o=document.getElementById("modal-time-start").value.split(":"),i=document.getElementById("modal-time-end").value.split(":");r.setHours(parseInt(o[0]),parseInt(o[1]),0,0),n.setHours(parseInt(i[0]),parseInt(i[1]),0,0);let l=document.getElementById("modal-subject").value,c=document.getElementById("modal-group").value,d=document.getElementById("modal-teacher").value;if(!c||!d){m("Error","Faltan datos por seleccionar (Grupo o Profesor)","error");return}if(re(r,n)){m("Error","No se puede programar una clase durante el recreo (12:00 - 12:30).","error");return}let u=(n.getTime()-r.getTime())/(1e3*60*60),p={id:"evt-"+Date.now(),start:r.toISOString(),end:n.toISOString(),duration:u,subjectId:l,groupId:c,teacherId:d,isPinned:!1};m("Guardando...","Enviando bloque a la base de datos API","info"),await s.API.saveClass(p),s.scheduledClasses.push(p),J(),L(),s.WS.sendCommand("MANUAL_EDIT",{id:p.id})}var ce=["#4f46e5","#0284c7","#059669","#d97706","#dc2626","#7c3aed","#db2777","#2563eb","#0d9488","#ca8a04","#ea580c","#e11d48","#9333ea","#16a34a"];function A(t){if(!t)return"#4f46e5";let e=0;for(let n=0;n<t.length;n++)e=t.charCodeAt(n)+((e<<5)-e);let r=Math.abs(e)%ce.length;return ce[r]}function me(){s.colorMode||(s.colorMode="teacher"),s.colorMode=s.colorMode==="teacher"?"subject":"teacher";let t=document.getElementById("btn-color-mode-text");t&&(t.textContent=s.colorMode==="teacher"?"Color: Profesor":"Color: Asignatura");let e=document.getElementById("btn-color-mode-icon");e&&(e.textContent=s.colorMode==="teacher"?"\u{1F3A8}":"\u{1F4DA}"),L()}function _e(t,e,r,n){let o=t.filter(c=>e==="teacher"?c.teacherId===r:e==="group"?c.groupId===r:!1),i=new Map;o.forEach(c=>{let d=new Date(c.start),u=`${`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`}_${c.subjectId}_${c.teacherId}_${c.groupId}`;i.has(u)||i.set(u,[]),i.get(u).push(c)});let l=[];return i.forEach(c=>{c.sort((a,u)=>new Date(a.start).getTime()-new Date(u.start).getTime());let d=0;for(;d<c.length;){let a=c[d],u=d+1<c.length?c[d+1]:null,p=new Date(a.end).getTime(),h=u?new Date(u.start).getTime():-1,b=u!==null&&Math.abs(p-h)<6e4,f=a.duration||(new Date(a.end).getTime()-new Date(a.start).getTime())/36e5,y=u?u.duration||(new Date(u.end).getTime()-new Date(u.start).getTime())/36e5:0,E=u!==null&&re(new Date(a.start),new Date(u.end));if(b&&!E&&f<=.51&&y<=.51&&f+y<=1.01){let x=a.isPinned||u.isPinned||!1,v=s.subjects.find(w=>w.id===a.subjectId),g=s.teachers.find(w=>w.id===a.teacherId),I=s.courses.find(w=>w.groups.some(M=>M.id===a.groupId)),C=I?I.groups.find(w=>w.id===a.groupId):null,S=v?`${x?"\u{1F4CC} ":""}${v.name}`:"Clase API",H=e==="group"?g?`Prof: ${g.name}`:"":I&&C?`${I.name} - G.${C.name}`:g?`Prof: ${g.name}`:"",P=n==="subject"?A(a.subjectId):g?g.color:"#4f46e5";l.push({id:a.id,mergedIds:[a.id,u.id],calendarId:a.teacherId,title:S,body:H,start:a.start,end:u.end,duration:f+y,isReadOnly:x,isPinned:x,backgroundColor:P,color:"#ffffff",customStyle:{borderRadius:"6px",border:"none",padding:"2px"},raw:{subjectId:a.subjectId,teacherId:a.teacherId,groupId:a.groupId}}),d+=2}else{let x=a.isPinned||!1,v=s.subjects.find(w=>w.id===a.subjectId),g=s.teachers.find(w=>w.id===a.teacherId),I=s.courses.find(w=>w.groups.some(M=>M.id===a.groupId)),C=I?I.groups.find(w=>w.id===a.groupId):null,S=v?`${x?"\u{1F4CC} ":""}${v.name}`:"Clase API",H=e==="group"?g?`Prof: ${g.name}`:"":I&&C?`${I.name} - G.${C.name}`:g?`Prof: ${g.name}`:"",P=n==="subject"?A(a.subjectId):g?g.color:"#4f46e5";l.push({id:a.id,mergedIds:[a.id],calendarId:a.teacherId,title:S,body:H,start:a.start,end:a.end,duration:f,isReadOnly:x,isPinned:x,backgroundColor:P,color:"#ffffff",customStyle:{borderRadius:"6px",border:"none",padding:"2px"},raw:{subjectId:a.subjectId,teacherId:a.teacherId,groupId:a.groupId}}),d+=1}}}),l}function L(){let t=document.getElementById("view-type-select"),e=document.getElementById("view-entity-select");if(!t||!e)return;let r=t.value,n=e.value;if(s.calendarInstance&&(s.calendarInstance.clear(),ge()),!n)return;let o=s.colorMode||"teacher",i=_e(s.scheduledClasses,r,n,o);s.currentMergedEvents=i,s.calendarInstance&&s.calendarInstance.createEvents(i);let l=document.getElementById("teacher-summary-card"),c=document.getElementById("teacher-summary-content");if(r==="teacher"&&n){let d=s.teachers.find(a=>a.id===n);if(d&&l&&c){let a=s.scheduledClasses.filter(y=>y.teacherId===n),u=a.reduce((y,E)=>y+E.duration,0),p=new Map;a.forEach(y=>{let E=s.subjects.find(S=>S.id===y.subjectId),x=s.courses.find(S=>S.groups.some(H=>H.id===y.groupId)),v=x?x.groups.find(S=>S.id===y.groupId):null,g=x?x.name:"Curso",I=v?v.name:"Grupo",C=E?E.name:"Asignatura",j=`${g}_${I}_${C}`;p.has(j)||p.set(j,{courseName:g,groupName:I,subjectName:C,hours:0}),p.get(j).hours+=y.duration});let h=d.maxHours||(s.config?Math.round(s.config.minutosMaximosProfesor/60):25),b=Array.from(p.values()),f=`
                <div class="flex flex-wrap items-center justify-between gap-4 mb-3 border-b border-gray-100 pb-2">
                    <div class="flex items-center gap-2">
                        <span class="w-3.5 h-3.5 rounded-full shadow-sm" style="background-color: ${d.color};"></span>
                        <h4 class="font-bold text-gray-800 text-sm">Resumen Docente: ${d.name}</h4>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500 font-medium">Carga Lectiva Asignada:</span>
                        <span class="text-xs font-bold px-2.5 py-1 ${u<=h?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-amber-50 text-amber-700 border border-amber-200"} rounded-full">
                            ${u.toFixed(1)}h / ${h}h max
                        </span>
                    </div>
                </div>
            `;b.length===0?f+='<p class="text-xs text-gray-400 italic">No tiene clases asignadas en el horario actual.</p>':(f+='<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">',b.forEach(y=>{f+=`
                        <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between hover:bg-slate-100 transition-colors">
                            <span class="text-xs font-bold text-slate-800 truncate">${y.courseName} - G.${y.groupName}</span>
                            <div class="flex justify-between items-center mt-1 text-[11px]">
                                <span class="text-indigo-600 font-semibold truncate">${y.subjectName}</span>
                                <span class="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">${y.hours.toFixed(1)}h</span>
                            </div>
                        </div>
                    `}),f+="</div>"),c.innerHTML=f,l.classList.remove("hidden")}}else l&&l.classList.add("hidden")}function te(t){let e=s.currentMergedEvents?.find(g=>g.id===t.id||g.mergedIds&&g.mergedIds.includes(t.id)),r=[];if(e&&e.mergedIds)r=s.scheduledClasses.filter(g=>e.mergedIds.includes(g.id));else{let g=s.scheduledClasses.find(I=>I.id===t.id);g&&(r=[g])}if(r.length===0)return;let n=r[0],o=s.subjects.find(g=>g.id===n.subjectId),i=s.teachers.find(g=>g.id===n.teacherId);if(!o||!i)return;let l=r.reduce((g,I)=>g+(I.duration||.5),0),c=r.some(g=>g.isPinned),d=s.courses.find(g=>g.groups.some(I=>I.id===n.groupId)),a=d?d.groups.find(g=>g.id===n.groupId):null,u=d&&a?`${d.name} - Grupo ${a.name}`:"Sin grupo",p=document.getElementById("event-detail-title");p&&(p.textContent=`${o.name} (${k(l)}h)`);let b=(s.colorMode||"teacher")==="subject"?A(n.subjectId):i.color,f=document.getElementById("event-detail-header");f&&(f.style.backgroundColor=b);let y=document.getElementById("event-detail-body");if(y){let g=new Date(e?e.start:n.start).toTimeString().slice(0,5),I=new Date(e?e.end:r[r.length-1].end).toTimeString().slice(0,5);y.innerHTML=`
            <p class="text-sm mb-1.5">Curso/Grupo: <b>${u}</b></p>
            <p class="text-sm mb-1.5">Impartida por: <b>${i.name}</b></p>
            <p class="text-xs text-gray-500">Horario: <b>${g} - ${I}</b> (${k(l)}h)</p>
        `}let E=document.getElementById("btn-pin-event");E&&(E.innerText=c?"Desfijar":"Fijar (Pin)",E.onclick=async()=>{let g=!c;for(let I of r){I.isPinned=g;try{await s.API.updateClass(I)}catch(C){console.error("Error al actualizar estado del pin:",C)}s.WS.sendCommand("PIN_UPDATE",{id:I.id,state:I.isPinned})}U(),L()});let x=document.getElementById("btn-delete-event");x&&(x.onclick=async()=>{for(let g of r)await s.API.deleteClass(g.id),s.scheduledClasses=s.scheduledClasses.filter(I=>I.id!==g.id),s.WS.sendCommand("MANUAL_EDIT",{delete:g.id});U(),L()});let v=document.getElementById("event-detail-modal");v&&(v.classList.replace("hidden","flex"),v.onclick=g=>{g.target===v&&U()})}function U(){let t=document.getElementById("event-detail-modal");t&&t.classList.replace("flex","hidden")}function re(t,e){let r=t.getHours(),n=t.getMinutes(),o=e.getHours(),i=e.getMinutes(),l=r*60+n,c=o*60+i,d=720,a=30;if(s.config){let p=s.config.horaInicioRecreo.split(":");d=parseInt(p[0])*60+parseInt(p[1]),a=s.config.duracionRecreo}let u=d+a;return l<u&&c>d}function ge(){if(!s.calendarInstance)return;let t=new Date,e=t.getDay(),r=t.getDate()-e+(e===0?-6:1),n=new Date(t);n.setDate(r),n.setHours(0,0,0,0);let o=12,i=0,l=30;if(s.config){let c=s.config.horaInicioRecreo.split(":");o=parseInt(c[0]),i=parseInt(c[1]),l=s.config.duracionRecreo}for(let c=0;c<5;c++){let d=new Date(n);d.setDate(n.getDate()+c);let a=new Date(d);a.setHours(o,i,0,0);let u=new Date(a);u.setMinutes(a.getMinutes()+l),s.calendarInstance.createEvents([{id:`recess-${c}`,calendarId:"recess",title:"\u2615 Recreo",start:a.toISOString(),end:u.toISOString(),isReadOnly:!0,isAllDay:!1,backgroundColor:"#f1f5f9",borderColor:"#94a3b8",color:"#64748b"}])}}async function pe(){let t=document.getElementById("view-type-select"),e=document.getElementById("view-entity-select");if(!t||!e)return;if(t.value!=="group"){m("Info","Por favor, selecciona la vista de 'Grupo' para vaciar un horario espec\xEDfico.","info");return}let r=e.value;if(!r){m("Info","No hay ning\xFAn grupo seleccionado.","info");return}let n=s.courses.flatMap(i=>i.groups).find(i=>i.id===r),o=n?n.name:"este grupo";if(confirm(`\xBFEst\xE1s seguro de que deseas vaciar todas las clases programadas para el grupo "${o}"?`))try{m("Limpiando...","Eliminando clases de la base de datos...","info"),await s.API.deleteGroupSchedule(r),s.scheduledClasses=s.scheduledClasses.filter(i=>i.groupId!==r),L(),m("\xC9xito","El horario del grupo se ha vaciado.","success"),s.WS.sendCommand("MANUAL_EDIT",{action:"cleared",groupId:r})}catch(i){console.error("Error clearing schedule:",i),m("Error","No se pudo limpiar el horario.","error")}}var Oe="",D=null,se="",ne=null;function fe(t,e=null){Oe=t,D=e;let r=document.getElementById("crud-modal-title"),n=document.getElementById("crud-modal-body");if(!r||!n)return;if(t==="subject"){r.textContent=e?"Editar Asignatura":"Nueva Asignatura";let l=e?s.subjects.find(d=>d.id===e):null,c=s.currentCourseId;n.innerHTML=`
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Asignatura</label>
                    <input type="text" id="crud-subject-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${l?.name||""}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Horas Semanales</label>
                    <input type="number" id="crud-subject-hours" required min="0.5" step="0.5" class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${l?.hours||4}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Curso Asociado</label>
                    <select id="crud-subject-course" disabled required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none bg-gray-100 cursor-not-allowed">
                        ${s.courses.map(d=>`<option value="${d.id}" ${d.id===(l?.courseId||c)?"selected":""}>${d.name}</option>`).join("")}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Profesores Cualificados (Especialistas)</label>
                    <div class="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                        ${s.teachers.map(d=>{let a=l?.teachers?.includes(d.id)||!1;return`
                                <label class="flex items-center gap-2 cursor-pointer text-sm">
                                    <input type="checkbox" name="crud-subject-teachers" value="${d.id}" ${a?"checked":""} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                    <span>${d.name}</span>
                                </label>
                            `}).join("")}
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow animate-fade-in">Guardar</button>
                </div>
            </form>
        `}else if(t==="teacher"){r.textContent=e?"Editar Profesor":"Nuevo Profesor";let l=e?s.teachers.find(c=>c.id===e):null;n.innerHTML=`
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Profesor</label>
                    <input type="text" id="crud-teacher-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${l?.name||""}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Horas M\xE1ximas Semanales</label>
                    <input type="number" id="crud-teacher-max-hours" required min="0.5" step="0.5" class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${l?.maxHours||22.5}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Color Identificativo</label>
                    <div class="flex gap-2 items-center">
                        <input type="color" id="crud-teacher-color" required class="w-10 h-10 border border-gray-300 rounded cursor-pointer" value="${l?.color||"#4f46e5"}">
                        <span class="text-xs text-gray-500">Color visual en el calendario.</span>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Especialidades (Materias habilitadas)</label>
                    <div class="border border-gray-300 rounded-lg p-3 max-h-56 overflow-y-auto space-y-3 bg-gray-50">
                        ${s.courses.map(c=>{let d=s.subjects.filter(a=>c.subjects.includes(a.id));return d.length===0?"":`
                                <div class="space-y-1.5">
                                    <div class="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded inline-block">
                                        \u{1F4DA} ${c.name}
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                                        ${d.map(a=>`
                                            <label class="flex items-center gap-2 cursor-pointer text-sm hover:bg-white p-1 rounded transition-colors">
                                                <input type="checkbox" name="crud-teacher-subjects" value="${a.id}" ${l?.subjects.includes(a.id)?"checked":""} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                                <span class="truncate font-medium text-gray-700">${a.name} <span class="text-xs text-gray-400 font-normal">(${k(a.hours)}h)</span></span>
                                            </label>
                                        `).join("")}
                                    </div>
                                </div>
                            `}).join("")}
                        ${(()=>{let c=s.subjects.filter(d=>!s.courses.some(a=>a.subjects.includes(d.id)));return c.length===0?"":`
                                <div class="space-y-1.5">
                                    <div class="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-200 px-2 py-0.5 rounded inline-block">
                                        Otras Asignaturas
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                                        ${c.map(d=>`
                                            <label class="flex items-center gap-2 cursor-pointer text-sm hover:bg-white p-1 rounded transition-colors">
                                                <input type="checkbox" name="crud-teacher-subjects" value="${d.id}" ${l?.subjects.includes(d.id)?"checked":""} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                                <span class="truncate font-medium text-gray-700">${d.name} <span class="text-xs text-gray-400 font-normal">(${k(d.hours)}h)</span></span>
                                            </label>
                                        `).join("")}
                                    </div>
                                </div>
                            `})()}
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
                </div>
            </form>
        `}else if(t==="course"){r.textContent=e?"Editar Curso":"Nuevo Curso";let l=e?s.courses.find(c=>c.id===e):null;n.innerHTML=`
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Curso</label>
                    <input type="text" id="crud-course-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${l?.name||""}">
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
                </div>
            </form>
        `}let o=document.getElementById("crud-modal");o&&o.classList.replace("hidden","flex");let i=document.getElementById("form-crud");i&&(i.onsubmit=async l=>{if(l.preventDefault(),t==="subject"){let c=document.getElementById("crud-subject-name").value,d=parseFloat(document.getElementById("crud-subject-hours").value),a=s.currentCourseId,u=document.querySelectorAll('input[name="crud-subject-teachers"]:checked'),p=Array.from(u).map(h=>h.value);try{await s.API.saveSubject({id:D||void 0,name:c,hours:d,courseId:a,teachers:p}),m("\xC9xito","Asignatura guardada correctamente","success"),N(),K()}catch{m("Error","No se pudo guardar la asignatura","error")}}else if(t==="teacher"){let c=document.getElementById("crud-teacher-name").value,d=parseFloat(document.getElementById("crud-teacher-max-hours").value),a=document.getElementById("crud-teacher-color").value,u=document.querySelectorAll('input[name="crud-teacher-subjects"]:checked'),p=Array.from(u).map(h=>h.value);try{let h=D?s.teachers.find(f=>f.id===D):null,b=h?h.availability:[];await s.API.saveTeacher({id:D||void 0,name:c,maxHours:d,color:a,subjects:p,availability:b}),m("\xC9xito","Profesor guardado correctamente","success"),N(),R()}catch{m("Error","No se pudo guardar el profesor","error")}}else if(t==="course"){let c=document.getElementById("crud-course-name").value;try{await s.API.saveCourse({id:D||void 0,name:c}),m("\xC9xito","Curso guardado correctamente","success"),N(),_()}catch{m("Error","No se pudo guardar el curso","error")}}})}function be(t,e=null){se=t,ne=e;let r=s.courses.find(d=>d.id===t);if(!r)return;let n=e?r.groups.find(d=>d.id===e):null,o=document.getElementById("crud-modal-title");o&&(o.textContent=e?"Editar Grupo":"Nuevo Grupo");let i=document.getElementById("crud-modal-body");if(!i)return;i.innerHTML=`
        <form id="form-group-crud" class="space-y-4">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Grupo (Letra/Identificador)</label>
                <input type="text" id="crud-group-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${n?.name||""}">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Tutor del Grupo</label>
                <select id="crud-group-tutor" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    ${s.teachers.map(d=>`<option value="${d.id}" ${n?.tutorId===d.id?"selected":""}>${d.name}</option>`).join("")}
                </select>
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
            </div>
        </form>
    `;let l=document.getElementById("crud-modal");l&&l.classList.replace("hidden","flex");let c=document.getElementById("form-group-crud");c&&(c.onsubmit=async d=>{d.preventDefault();let a=document.getElementById("crud-group-name").value,u=document.getElementById("crud-group-tutor").value;try{let p=s.courses.find(h=>h.id===se);if(!p)return;if(ne){let h=p.groups.find(b=>b.id===ne);h&&(h.name=a,h.tutorId=u)}else{let h={id:"temp-"+Date.now(),name:a,tutorId:u,assignments:{}};p.groups.push(h)}await s.API.updateCourseGroup(se,p.groups),m("\xC9xito","Grupo guardado correctamente","success"),N(),_()}catch{m("Error","No se pudo guardar el grupo","error")}})}function N(){let t=document.getElementById("crud-modal");t&&t.classList.replace("flex","hidden")}function he(t){s.currentCourseId=t,window.switchTab("subjects")}async function K(){try{s.subjects=await s.API.getSubjects(),s.courses=await s.API.getCourses();let t=s.currentCourseId,e=document.getElementById("view-subjects-title");if(e){let o=s.courses.find(i=>i.id===t);e.textContent=o?`Asignaturas de ${o.name}`:"Gesti\xF3n de Asignaturas"}let r=document.getElementById("table-subjects");if(!r)return;if(r.innerHTML="",!t){r.innerHTML='<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">Por favor, selecciona un curso primero.</td></tr>';return}let n=s.subjects.filter(o=>o.courseId===t);if(n.length===0){r.innerHTML='<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">No hay asignaturas en este curso.</td></tr>';return}n.forEach(o=>{r.innerHTML+=`
                <tr class="hover:bg-gray-50 border-b border-gray-100 text-sm">
                    <td class="p-4 font-medium text-gray-800">${o.name}</td>
                    <td class="p-4 text-center text-gray-600">${k(o.hours)} h</td>
                    <td class="p-4 text-center">
                        <button onclick="openFormModal('subject', '${o.id}')" class="text-indigo-600 hover:text-indigo-900 font-semibold mr-3">Editar</button>
                        <button onclick="deleteSubject('${o.id}')" class="text-red-600 hover:text-red-900 font-semibold">Eliminar</button>
                    </td>
                </tr>
            `})}catch(t){console.error(t),m("Error","No se pudieron cargar las asignaturas","error")}}async function xe(t){if(confirm("\xBFEst\xE1s seguro de que deseas eliminar esta asignatura?"))try{await s.API.deleteSubject(t),m("\xC9xito","Asignatura eliminada correctamente","success"),K()}catch{m("Error","No se pudo eliminar la asignatura","error")}}async function R(){try{s.teachers=await s.API.getTeachers();let t=document.getElementById("list-teachers");if(!t)return;t.innerHTML="",s.teachers.forEach(e=>{let r=e.subjects.map(n=>{let o=s.subjects.find(l=>l.id===n);if(!o)return"";let i=s.courses.find(l=>l.subjects.includes(n));return i?`${o.name} (${i.name})`:o.name}).filter(n=>n!=="").join(", ");t.innerHTML+=`
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold text-gray-800 text-lg">${e.name}</h3>
                            <span class="w-4 h-4 rounded-full border border-gray-300" style="background-color: ${e.color}"></span>
                        </div>
                        <p class="text-sm text-gray-500 mb-1">Max: <b>${k(e.maxHours)} h / semana</b></p>
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
            `})}catch(t){console.error(t),m("Error","No se pudieron cargar los profesores","error")}}async function ye(t){if(confirm("\xBFEst\xE1s seguro de que deseas eliminar este profesor?"))try{await s.API.deleteTeacher(t),m("\xC9xito","Profesor eliminado correctamente","success"),R()}catch{m("Error","No se pudo eliminar al profesor","error")}}async function _(){try{s.courses=await s.API.getCourses(),s.teachers=await s.API.getTeachers();let t=document.getElementById("list-courses");if(!t)return;t.innerHTML="",s.courses.forEach(e=>{let r="";e.groups.length===0?r='<p class="text-xs text-gray-400 italic">No hay grupos creados en este curso.</p>':r=`
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        ${e.groups.map(n=>{let o=s.teachers.find(i=>i.id===n.tutorId);return`
                                <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                                    <div>
                                        <h4 class="font-semibold text-gray-700 text-sm">Grupo ${n.name}</h4>
                                        <p class="text-xs text-gray-500">Tutor: ${o?o.name:"Sin asignar"}</p>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="openGroupModal('${e.id}', '${n.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold">Editar</button>
                                        <button onclick="deleteGroup('${e.id}', '${n.id}')" class="text-red-600 hover:text-red-900 text-xs font-bold">Borrar</button>
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
            `})}catch(t){console.error(t),m("Error","No se pudieron cargar los cursos","error")}}async function ve(t){if(confirm("\xBFEst\xE1s seguro de que deseas eliminar este curso y todos sus grupos?"))try{await s.API.deleteCourse(t),m("\xC9xito","Curso eliminado correctamente","success"),_()}catch{m("Error","No se pudo eliminar el curso","error")}}async function Ee(t,e){if(confirm("\xBFEst\xE1s seguro de que deseas eliminar este grupo?"))try{let r=s.courses.find(o=>o.id===t);if(!r)return;let n=r.groups.filter(o=>o.id!==e);await s.API.updateCourseGroup(t,n),m("\xC9xito","Grupo eliminado correctamente","success"),_()}catch{m("Error","No se pudo eliminar el grupo","error")}}async function Ie(){let t=document.getElementById("assignments-list");if(t){t.innerHTML="";try{if(s.courses=await s.API.getCourses(),s.subjects=await s.API.getSubjects(),s.teachers=await s.API.getTeachers(),s.courses.length===0){t.innerHTML='<div class="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 italic">No hay asignaciones cargadas. Cree cursos y grupos primero.</div>';return}s.courses.forEach(e=>{let r=s.subjects.filter(o=>o.courseId===e.id);if(e.groups.length===0)return;let n="";e.groups.forEach(o=>{let i="";r.length===0?i='<p class="text-xs text-gray-400 italic py-2">No hay asignaturas en este curso.</p>':r.forEach(l=>{let c=o.assignments[l.id]||"",d=s.teachers.filter(a=>a.subjects.includes(l.id));i+=`
                            <div class="flex flex-col gap-1.5 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                                <span class="text-sm font-semibold text-gray-700 truncate block" title="${l.name}">${l.name} (${k(l.hours)}h)</span>
                                <select onchange="updateAssignment('${e.id}', '${o.id}', '${l.id}', this.value)" class="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white hover:border-slate-400 focus:border-indigo-500 outline-none transition-colors">
                                    <option value="">-- Sin asignar --</option>
                                    ${s.teachers.map(a=>{let p=d.some(h=>h.id===a.id)?a.name:`${a.name} (No especialista)`;return`<option value="${a.id}" ${c===a.id?"selected":""}>${p}</option>`}).join("")}
                                </select>
                            </div>
                        `}),n+=`
                    <div id="group-card-${e.id}-${o.id}" class="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
                        <div class="flex items-center justify-between border-b pb-2">
                            <h4 class="font-bold text-gray-800 text-sm">Grupo ${o.name}</h4>
                            <button onclick="clearGroupAssignments('${e.id}', '${o.id}')" class="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-0.5" title="Poner todas las asignaturas de este grupo sin asignar">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                Vaciar Grupo
                            </button>
                        </div>
                        <div class="space-y-3">
                            ${i}
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
                        ${n}
                    </div>
                </div>
            `})}catch(e){console.error(e),m("Error","No se pudieron cargar las asignaciones","error")}}}async function we(t,e,r,n){try{let o=s.courses.find(l=>l.id===t);if(!o)return;let i=o.groups.find(l=>l.id===e);if(!i)return;n===""?delete i.assignments[r]:i.assignments[r]=n,await s.API.updateCourseGroup(t,o.groups),m("\xC9xito","Asignaci\xF3n actualizada","success")}catch{m("Error","No se pudo guardar la asignaci\xF3n","error")}}async function Ce(t,e){try{let r=s.courses.find(i=>i.id===t);if(!r)return;let n=r.groups.find(i=>i.id===e);if(!n||!confirm(`\xBFEst\xE1s seguro de que deseas poner todas las asignaturas del grupo "${n.name}" sin asignar?`))return;n.assignments={},await s.API.updateCourseGroup(t,r.groups);let o=document.getElementById(`group-card-${t}-${e}`);o&&o.querySelectorAll("select").forEach(l=>{l.value=""}),m("\xC9xito","Todas las asignaturas del grupo han sido puestas sin asignar","success")}catch{m("Error","No se pudo limpiar las asignaciones del grupo","error")}}async function Se(t){try{let e=s.courses.find(n=>n.id===t);if(!e||!confirm(`\xBFEst\xE1s seguro de que deseas poner todas las asignaturas de TODOS los grupos del curso "${e.name}" sin asignar?`))return;e.groups.forEach(n=>{n.assignments={}}),await s.API.updateCourseGroup(t,e.groups);let r=document.getElementById(`course-card-${t}`);r&&r.querySelectorAll("select").forEach(o=>{o.value=""}),m("\xC9xito","Todas las asignaturas del curso han sido puestas sin asignar","success")}catch{m("Error","No se pudo limpiar las asignaciones del curso","error")}}var oe=null,O=[];function Te(t){let e=s.teachers.find(l=>l.id===t);if(!e)return;oe=t,O=e.availability?[...e.availability]:[];let r=document.getElementById("availability-teacher-name");r&&(r.textContent=e.name);let n=document.getElementById("availability-grid-body");if(!n)return;n.innerHTML="",[{start:"09:00",end:"09:30"},{start:"09:30",end:"10:00"},{start:"10:00",end:"10:30"},{start:"10:30",end:"11:00"},{start:"11:00",end:"11:30"},{start:"11:30",end:"12:00"},{start:"12:30",end:"13:00"},{start:"13:00",end:"13:30"},{start:"13:30",end:"14:00"}].forEach((l,c)=>{let d="";for(let a=1;a<=5;a++){let u=O.some(f=>f.dayOfWeek===a&&f.startTime===l.start&&f.endTime===l.end),p=`cell-av-${a}-${c}`,h=u?"bg-red-500 hover:bg-red-600 text-white border-red-300 font-bold":"bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200",b=u?"NO DISPONIBLE":"DISPONIBLE";d+=`
                <td class="p-2 text-center border border-gray-200">
                    <button type="button" id="${p}" 
                        onclick="toggleAvailabilitySlot(${a}, '${l.start}', '${l.end}', '${p}')"
                        class="w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all ${h}">
                        ${b}
                    </button>
                </td>
            `}n.innerHTML+=`
            <tr class="hover:bg-gray-50">
                <td class="p-3 border border-gray-200 font-semibold text-gray-700 text-center">${l.start} - ${l.end}</td>
                ${d}
            </tr>
        `});let i=document.getElementById("availability-modal");i&&i.classList.replace("hidden","flex")}function Me(t,e,r,n){let o=document.getElementById(n);if(!o)return;let i=O.findIndex(l=>l.dayOfWeek===t&&l.startTime===e&&l.endTime===r);i>-1?(O.splice(i,1),o.className="w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200",o.textContent="DISPONIBLE"):(O.push({dayOfWeek:t,startTime:e,endTime:r}),o.className="w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all bg-red-500 hover:bg-red-600 text-white border border-red-300 font-bold",o.textContent="NO DISPONIBLE")}function ae(){let t=document.getElementById("availability-modal");t&&t.classList.replace("flex","hidden")}async function $e(){if(!oe)return;let t=s.teachers.find(e=>e.id===oe);if(t){t.availability=O;try{await s.API.saveTeacher(t),m("\xC9xito","Disponibilidad docente guardada correctamente","success"),ae(),R()}catch{m("Error","No se pudo guardar la disponibilidad","error")}}}function Le(){let t=s.config;if(!t)return;let e=document.getElementById("settings-tiempo-minimo"),r=document.getElementById("settings-tiempo-maximo"),n=document.getElementById("settings-max-minutos-profesor"),o=document.getElementById("settings-priorizar-tutor"),i=document.getElementById("settings-priorizar-tutor-puntos"),l=document.getElementById("settings-bloques-60-puntos"),c=document.getElementById("settings-minimizar-asignaturas"),d=document.getElementById("settings-minimizar-asignaturas-puntos"),a=document.getElementById("settings-limite-tiempo"),u=document.getElementById("settings-tiempo-estancamiento"),p=document.getElementById("settings-hora-inicio"),h=document.getElementById("settings-hora-fin"),b=document.getElementById("settings-recreo-inicio"),f=document.getElementById("settings-recreo-duracion"),y=document.getElementById("settings-respetar-especialidad"),E=document.getElementById("settings-respetar-limite-horas"),x=document.getElementById("settings-respetar-disponibilidad");if(e&&(e.value=t.tiempoMinimo.toString()),r&&(r.value=t.tiempoMaximo.toString()),n&&(n.value=t.minutosMaximosProfesor.toString()),o){o.checked=t.priorizarTutor;let v=document.getElementById("settings-tutor-points-container");v&&(v.style.display=t.priorizarTutor?"flex":"none"),o.onchange=()=>{v&&(v.style.display=o.checked?"flex":"none")}}if(i&&(i.value=t.priorizarTutorPuntos.toString()),l&&(l.value=t.fomentarBloques60Puntos.toString()),c){c.checked=t.minimizarAsignaturasDistintas??!0;let v=document.getElementById("settings-minimizar-asignaturas-points-container");v&&(v.style.display=c.checked?"flex":"none"),c.onchange=()=>{v&&(v.style.display=c.checked?"flex":"none")}}d&&(d.value=(t.minimizarAsignaturasPuntos??50).toString()),a&&(a.value=(t.limiteTiempoSegundos??18e3).toString()),u&&(u.value=(t.tiempoEstancamientoSegundos??60).toString()),p&&(p.value=t.horaInicioClases),h&&(h.value=t.horaFinClases),b&&(b.value=t.horaInicioRecreo),f&&(f.value=t.duracionRecreo.toString()),y&&(y.checked=t.respetarEspecialidad),E&&(E.checked=t.respetarLimiteHoras),x&&(x.checked=t.respetarDisponibilidad)}async function je(){let t=document.getElementById("settings-tiempo-minimo"),e=document.getElementById("settings-tiempo-maximo"),r=document.getElementById("settings-max-minutos-profesor"),n=document.getElementById("settings-priorizar-tutor"),o=document.getElementById("settings-priorizar-tutor-puntos"),i=document.getElementById("settings-bloques-60-puntos"),l=document.getElementById("settings-minimizar-asignaturas"),c=document.getElementById("settings-minimizar-asignaturas-puntos"),d=document.getElementById("settings-limite-tiempo"),a=document.getElementById("settings-tiempo-estancamiento"),u=document.getElementById("settings-hora-inicio"),p=document.getElementById("settings-hora-fin"),h=document.getElementById("settings-recreo-inicio"),b=document.getElementById("settings-recreo-duracion"),f=document.getElementById("settings-respetar-especialidad"),y=document.getElementById("settings-respetar-limite-horas"),E=document.getElementById("settings-respetar-disponibilidad"),x={priorizarTutor:n?n.checked:!1,tiempoMinimo:t?parseInt(t.value):30,tiempoMaximo:e?parseInt(e.value):60,minutosMaximosProfesor:r?parseInt(r.value):1500,priorizarTutorPuntos:o?parseInt(o.value):100,fomentarBloques60Puntos:i?parseInt(i.value):10,minimizarAsignaturasDistintas:l?l.checked:!0,minimizarAsignaturasPuntos:c?parseInt(c.value):50,limiteTiempoSegundos:d?parseFloat(d.value):18e3,tiempoEstancamientoSegundos:a?parseFloat(a.value):60,horaInicioClases:u?u.value:"09:00",horaFinClases:p?p.value:"14:00",horaInicioRecreo:h?h.value:"12:00",duracionRecreo:b?parseInt(b.value):30,respetarEspecialidad:f?f.checked:!0,respetarLimiteHoras:y?y.checked:!0,respetarDisponibilidad:E?E.checked:!0};try{s.config=await s.API.saveConfig(x),m("\xC9xito","Configuraci\xF3n de reglas guardada correctamente","success")}catch{m("Error","No se pudo guardar la configuraci\xF3n","error")}}var Q={ok:'<svg class="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',warning:'<svg class="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',error:'<svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'},He={ok:{bg:"bg-emerald-50",border:"border-emerald-200",text:"text-emerald-800",badge:"bg-emerald-100 text-emerald-700"},warning:{bg:"bg-amber-50",border:"border-amber-200",text:"text-amber-800",badge:"bg-amber-100 text-amber-700"},error:{bg:"bg-red-50",border:"border-red-200",text:"text-red-800",badge:"bg-red-100 text-red-700"}};function Ge(t){let e=(t.status||"ok").toLowerCase(),r=He[e]||He.ok,n=Q[e]||Q.ok,o=t.details&&t.details.length>0?`<div class="mt-2.5 pt-2 border-t border-red-200/60 space-y-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider ${r.text} opacity-90">Detalles del conflicto (${t.details.length}):</div>
            <ul class="space-y-1 text-xs text-gray-700">
                ${t.details.map(i=>`<li class="flex items-start gap-1.5 leading-relaxed bg-white/70 p-2 rounded border border-red-100"><span class="text-red-500 font-bold">\u2022</span><span class="flex-1">${i}</span></li>`).join("")}
            </ul>
           </div>`:"";return`
        <div class="p-3.5 rounded-xl ${r.bg} border ${r.border} transition-all duration-200 shadow-sm">
            <div class="flex items-start gap-3">
                ${n}
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <div class="font-bold text-sm ${r.text}">${t.name}</div>
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${r.badge} uppercase tracking-wider">${e}</span>
                    </div>
                    <div class="text-xs text-gray-600 mt-1">${t.message}</div>
                    ${o}
                </div>
            </div>
        </div>
    `}async function Pe(){let t=document.getElementById("prevalidation-modal"),e=document.getElementById("prevalidation-body"),r=document.getElementById("prevalidation-summary");if(!(!t||!e||!r)){t.classList.remove("hidden"),t.classList.add("flex"),e.innerHTML=`
        <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <span class="ml-3 text-gray-500 text-sm">Analizando viabilidad...</span>
        </div>
    `,r.innerHTML="";try{let n=await s.API.getPrevalidation(),o=n.checks.filter(d=>(d.status||"").toLowerCase()==="error").length,i=n.checks.filter(d=>(d.status||"").toLowerCase()==="warning").length,l=n.checks.filter(d=>(d.status||"").toLowerCase()==="ok").length;n.viable&&o===0?r.innerHTML=`
                <div class="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    ${Q.ok}
                    <div>
                        <div class="text-emerald-800 font-bold text-sm">Plantilla Viable \u2014 Todos los chequeos superados</div>
                        <div class="text-xs text-emerald-600 mt-0.5">El sistema puede generar los horarios sin conflictos estructurales.</div>
                    </div>
                    <span class="ml-auto text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">${l} OK</span>
                </div>
            `:r.innerHTML=`
                <div class="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                    ${Q.error}
                    <div>
                        <div class="text-red-800 font-bold text-sm">Inviabilidad Detectada \u2014 ${o} chequeo(s) con errores</div>
                        <div class="text-xs text-red-600 mt-0.5">Corrige los puntos se\xF1alados abajo para asegurar la viabilidad.</div>
                    </div>
                    <span class="ml-auto text-xs font-semibold px-2.5 py-1 bg-red-100 text-red-800 rounded-full">${o} Error${o!==1?"es":""}</span>
                </div>
            `;let c=[...n.checks].sort((d,a)=>{let u={error:0,warning:1,ok:2},p=(d.status||"ok").toLowerCase(),h=(a.status||"ok").toLowerCase();return(u[p]??2)-(u[h]??2)});e.innerHTML=c.map(Ge).join("")}catch(n){e.innerHTML=`
            <div class="text-center py-8 text-red-500">
                <p class="font-bold">Error al ejecutar el diagn\xF3stico</p>
                <p class="text-sm text-gray-500 mt-1">${n}</p>
            </div>
        `}}}function ke(){let t=document.getElementById("prevalidation-modal");t&&(t.classList.add("hidden"),t.classList.remove("flex"))}function Be(){if(!s.courses||s.courses.length===0){m("Info","No hay cursos ni grupos registrados para imprimir.","info");return}let t=document.getElementById("print-area");t||(t=document.createElement("div"),t.id="print-area",document.body.appendChild(t));let e=9,r=14,n=30;if(s.config){let a=s.config.horaInicioClases.split(":"),u=s.config.horaFinClases.split(":");e=parseInt(a[0]),r=parseInt(u[0]),n=s.config.tiempoMinimo||30}let o=[],i=e*60,l=r*60;for(;i<l;){let a=i+n,u=Math.floor(i/60).toString().padStart(2,"0"),p=(i%60).toString().padStart(2,"0"),h=Math.floor(a/60).toString().padStart(2,"0"),b=(a%60).toString().padStart(2,"0");o.push({startStr:`${u}:${p}`,endStr:`${h}:${b}`,startMin:i,endMin:a}),i=a}let c=[{id:1,name:"Lunes"},{id:2,name:"Martes"},{id:3,name:"Mi\xE9rcoles"},{id:4,name:"Jueves"},{id:5,name:"Viernes"}],d="";s.courses.forEach(a=>{a.groups.forEach(u=>{let p=s.scheduledClasses.filter(b=>b.groupId===u.id);d+=`
                <div class="print-page">
                    <div class="flex justify-between items-center mb-2 border-b-2 border-indigo-600 pb-1">
                        <div>
                            <h1 class="text-xl font-bold text-gray-900 leading-tight">${a.name} - Grupo ${u.name}</h1>
                            <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Horario Lectivo Oficial \u2022 EduSchedule</p>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">Clases: ${p.length}</span>
                        </div>
                    </div>

                    <table class="w-full border-collapse border border-gray-300 text-xs table-fixed">
                        <thead>
                            <tr class="bg-slate-800 text-white font-bold border-b border-gray-300">
                                <th class="p-1 border border-gray-300 w-20 text-center text-[10px]">Hora</th>
                                ${c.map(b=>`<th class="p-1 border border-gray-300 text-center text-[11px]">${b.name}</th>`).join("")}
                            </tr>
                        </thead>
                        <tbody>
            `;let h=new Map;c.forEach(b=>h.set(b.id,new Set)),o.forEach((b,f)=>{let y=!1;if(s.config){let E=s.config.horaInicioRecreo.split(":"),x=parseInt(E[0])*60+parseInt(E[1]),v=x+s.config.duracionRecreo;b.startMin>=x&&b.startMin<v&&(y=!0)}if(y){d+=`
                        <tr class="bg-gray-100 text-gray-500 font-semibold">
                            <td class="p-1 border border-gray-300 text-center font-mono text-[9px]">${b.startStr} - ${b.endStr}</td>
                            <td colspan="5" class="p-1 border border-gray-300 text-center bg-gray-100 text-slate-500 text-[10px]">\u2615 Recreo</td>
                        </tr>
                    `;return}d+="<tr>",d+=`<td class="p-1 border border-gray-300 text-center font-mono text-[9px] font-medium bg-gray-50">${b.startStr} - ${b.endStr}</td>`,c.forEach(E=>{if(h.get(E.id).has(f))return;let x=p.find(v=>{let g=new Date(v.start);return g.getDay()!==E.id?!1:g.getHours()*60+g.getMinutes()===b.startMin});if(x){let v=s.subjects.find(w=>w.id===x.subjectId),g=s.teachers.find(w=>w.id===x.teacherId),I=A(x.subjectId),C=x.isPinned?"\u{1F4CC} ":"",j=!1,S=f+1<o.length?o[f+1]:null;if(S){let w=!1;if(s.config){let M=s.config.horaInicioRecreo.split(":"),$=parseInt(M[0])*60+parseInt(M[1]),T=$+s.config.duracionRecreo;S.startMin>=$&&S.startMin<T&&(w=!0)}if(!w){let M=p.find($=>{let T=new Date($.start);return T.getDay()!==E.id?!1:T.getHours()*60+T.getMinutes()===S.startMin});M&&M.subjectId===x.subjectId&&M.teacherId===x.teacherId&&M.groupId===x.groupId&&(j=!0,h.get(E.id).add(f+1))}}let H=j?'rowspan="2"':"",P=j?" (1h)":"";d+=`
                            <td ${H} class="p-1 border border-gray-300 align-middle text-white font-medium shadow-inner" style="background-color: ${I} !important; color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
                                <div class="font-bold text-[10px] truncate leading-tight">${C}${v?v.name:"Clase"}${P}</div>
                                ${g?`<div class="text-[9px] opacity-95 truncate leading-tight font-normal">Prof: ${g.name}</div>`:""}
                            </td>
                        `}else d+='<td class="p-1 border border-gray-300 text-center text-gray-300 bg-white text-[9px]">--</td>'}),d+="</tr>"}),d+=`
                        </tbody>
                    </table>
                </div>
            `})}),s.teachers.forEach(a=>{let u=s.scheduledClasses.filter(b=>b.teacherId===a.id),p=u.reduce((b,f)=>b+f.duration,0);d+=`
            <div class="print-page">
                <div class="flex justify-between items-center mb-2 border-b-2 border-indigo-600 pb-1">
                    <div>
                        <h1 class="text-xl font-bold text-gray-900 leading-tight">Horario Personal Docente: ${a.name}</h1>
                        <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Horario Individual \u2022 EduSchedule</p>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">Jornada: ${p.toFixed(1)}h</span>
                    </div>
                </div>

                <table class="w-full border-collapse border border-gray-300 text-xs table-fixed">
                    <thead>
                        <tr class="bg-slate-800 text-white font-bold border-b border-gray-300">
                            <th class="p-1 border border-gray-300 w-20 text-center text-[10px]">Hora</th>
                            ${c.map(b=>`<th class="p-1 border border-gray-300 text-center text-[11px]">${b.name}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
        `;let h=new Map;c.forEach(b=>h.set(b.id,new Set)),o.forEach((b,f)=>{let y=!1;if(s.config){let E=s.config.horaInicioRecreo.split(":"),x=parseInt(E[0])*60+parseInt(E[1]),v=x+s.config.duracionRecreo;b.startMin>=x&&b.startMin<v&&(y=!0)}if(y){d+=`
                    <tr class="bg-gray-100 text-gray-500 font-semibold">
                        <td class="p-1 border border-gray-300 text-center font-mono text-[9px]">${b.startStr} - ${b.endStr}</td>
                        <td colspan="5" class="p-1 border border-gray-300 text-center bg-gray-100 text-slate-500 text-[10px]">\u2615 Recreo</td>
                    </tr>
                `;return}d+="<tr>",d+=`<td class="p-1 border border-gray-300 text-center font-mono text-[9px] font-medium bg-gray-50">${b.startStr} - ${b.endStr}</td>`,c.forEach(E=>{if(h.get(E.id).has(f))return;let x=u.find(v=>{let g=new Date(v.start);return g.getDay()!==E.id?!1:g.getHours()*60+g.getMinutes()===b.startMin});if(x){let v=s.subjects.find($=>$.id===x.subjectId),g=s.courses.find($=>$.groups.some(T=>T.id===x.groupId)),I=g?g.groups.find($=>$.id===x.groupId):null,C=g&&I?`${g.name} G.${I.name}`:"",j=A(x.subjectId),S=x.isPinned?"\u{1F4CC} ":"",H=!1,P=f+1<o.length?o[f+1]:null;if(P){let $=!1;if(s.config){let T=s.config.horaInicioRecreo.split(":"),G=parseInt(T[0])*60+parseInt(T[1]),z=G+s.config.duracionRecreo;P.startMin>=G&&P.startMin<z&&($=!0)}if(!$){let T=u.find(G=>{let z=new Date(G.start);return z.getDay()!==E.id?!1:z.getHours()*60+z.getMinutes()===P.startMin});T&&T.subjectId===x.subjectId&&T.teacherId===x.teacherId&&T.groupId===x.groupId&&(H=!0,h.get(E.id).add(f+1))}}let w=H?'rowspan="2"':"",M=H?" (1h)":"";d+=`
                        <td ${w} class="p-1 border border-gray-300 align-middle text-white font-medium shadow-inner" style="background-color: ${j} !important; color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
                            <div class="font-bold text-[10px] truncate leading-tight">${S}${v?v.name:"Clase"}${M}</div>
                            ${C?`<div class="text-[9px] opacity-95 truncate leading-tight font-normal">${C}</div>`:""}
                        </td>
                    `}else d+='<td class="p-1 border border-gray-300 text-center text-gray-300 bg-white text-[9px]">--</td>'}),d+="</tr>"}),d+=`
                    </tbody>
                </table>
            </div>
        `}),t.innerHTML=d,m("Imprimiendo","Preparando documento A4 Horizontal con horarios de grupos y profesores...","info"),setTimeout(()=>{window.print()},300)}var Y="0.0.6",ze="guillemo12/Horarios-profesores";function Ae(t){return t.replace(/^v/,"").trim().split(".").map(r=>parseInt(r,10)||0)}function We(t,e=Y){let r=Ae(t),n=Ae(e),o=Math.max(r.length,n.length);for(let i=0;i<o;i++){let l=r[i]??0,c=n[i]??0;if(l>c)return!0;if(l<c)return!1}return!1}function Ue(t){if(!t||t.length===0)return null;let e=navigator.userAgent.includes("Windows")||navigator.platform.includes("Win"),r=navigator.userAgent.includes("Linux");if(e){let n=t.find(c=>c.name.endsWith("-setup.exe"));if(n)return n;let o=t.find(c=>c.name.includes("Unico")&&c.name.endsWith(".exe"));if(o)return o;let i=t.find(c=>c.name.endsWith(".exe"));if(i)return i;let l=t.find(c=>c.name.endsWith(".msi"));if(l)return l}if(r){let n=t.find(i=>i.name.endsWith(".AppImage"));if(n)return n;let o=t.find(i=>i.name.endsWith(".deb"));if(o)return o}return t[0]||null}async function ie(t=!1){try{let e=await fetch(`https://api.github.com/repos/${ze}/releases/latest`,{headers:{Accept:"application/vnd.github.v3+json"}});if(!e.ok){t||m("Actualizaciones","No se encontr\xF3 ning\xFAn release publicado en GitHub.","warning");return}let r=await e.json();We(r.tag_name,Y)?qe(r):t||m("Actualizado",`EduSchedule est\xE1 al d\xEDa (v${Y}).`,"success")}catch(e){console.error("Error al buscar actualizaciones:",e),t||m("Error","Error de red al consultar actualizaciones.","error")}}function qe(t){let e=document.getElementById("modal-update-dialog");e||(e=document.createElement("div"),e.id="modal-update-dialog",e.className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4",document.body.appendChild(e));let r=Ue(t.assets);e.innerHTML=`
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden transition-all transform scale-100">
            <div class="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                        \u{1F680}
                    </div>
                    <div>
                        <h3 class="font-bold text-lg leading-tight">\xA1Nueva versi\xF3n disponible!</h3>
                        <p class="text-xs text-indigo-100 font-medium">v${Y} \u2794 <span class="font-bold text-white">${t.tag_name}</span></p>
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
    `;let n=document.getElementById("btn-trigger-update");n&&r?n.addEventListener("click",async()=>{await Fe(r,t)}):n&&n.addEventListener("click",()=>{window.open(t.html_url,"_blank")})}async function Fe(t,e){let r=document.getElementById("update-action-container");if(r){r.innerHTML=`
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
    `;try{let n=await fetch("/api/v1/system/update/install",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({downloadUrl:t.browser_download_url,fileName:t.name})});if(n.ok){let o=document.getElementById("update-status-text");o&&(o.innerText="\xA1Descarga completa! Iniciando instalador..."),m("Actualizaci\xF3n","La aplicaci\xF3n se est\xE1 reiniciando con la nueva versi\xF3n.","success")}else throw new Error(`Servidor devolvi\xF3 status ${n.status}`)}catch(n){console.error("Error al ejecutar actualizaci\xF3n de un clic:",n),m("Error de actualizaci\xF3n","No se pudo actualizar autom\xE1ticamente. Abriendo descarga directa.","warning"),r.innerHTML=`
            <div class="space-y-2">
                <p class="text-xs text-rose-600 font-medium text-center">No se pudo completar autom\xE1ticamente. Puede descargar el instalador directamente:</p>
                <a href="${t.browser_download_url}" target="_blank" class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2">
                    \u2B07\uFE0F Descargar ${t.name}
                </a>
            </div>
        `}}}var s={API:new q,WS:new F,subjects:[],teachers:[],courses:[],scheduledClasses:[],calendarInstance:null,currentEventContext:null};s.currentCourseId=null;function de(t,e,r="",n=0,o=""){fetch("/api/v1/log",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({level:t,message:e,source:r,line:n,stack:o??""})}).catch(()=>{})}window.onerror=(t,e,r,n,o)=>(de("error",String(t),e??"",r??0,o?.stack??""),!1);window.addEventListener("unhandledrejection",t=>{let e=t.reason,r=e instanceof Error?e.message:String(e);de("error",`Unhandled Promise Rejection: ${r}`,"",0,e?.stack??"")});var Ve=console.error.bind(console);console.error=(...t)=>{Ve(...t);let e=t.map(n=>n instanceof Error?n.message:String(n)).join(" "),r=t.find(n=>n instanceof Error)?.stack??"";de("error",e,"console.error",0,r)};async function Je(t=15,e=1e3){let r=document.getElementById("loader-text");for(let n=1;n<=t;n++){try{if(r&&n>1&&(r.textContent=`Iniciando motor y servidor local... (${n}/${t})`),(await fetch("/api/v1/config",{cache:"no-store"})).ok)return!0}catch{}await new Promise(o=>setTimeout(o,e))}return!1}window.onload=async function(){try{if(!await Je())throw new Error("No se pudo conectar con el servidor Ktor tras varios intentos.");s.subjects=await s.API.getSubjects(),s.teachers=await s.API.getTeachers(),s.courses=await s.API.getCourses(),s.scheduledClasses=await s.API.getSchedule(),s.config=await s.API.getConfig();let e=document.getElementById("app-loader");e&&(e.style.opacity="0",setTimeout(()=>e.remove(),300)),le(),X(),V(),s.WS.connect(),Ke(),setTimeout(()=>{ie(!0)},2e3)}catch(t){console.error("Init Error:",t);let e=document.getElementById("loader-text");e&&(e.textContent="Error conectando con la API local. Aseg\xFArese de que el servidor Ktor est\xE9 encendido.",e.className="mt-4 text-red-600 font-bold px-4 text-center")}};function Ke(){let t=document.getElementById("btn-toggle-engine"),e=document.getElementById("ws-status");s.WS.on("connected",()=>{t&&(t.disabled=!1,t.classList.replace("bg-gray-400","bg-emerald-600"),t.classList.add("hover:bg-emerald-700"),t.classList.remove("cursor-not-allowed"));let r=document.getElementById("text-engine-btn");r&&(r.textContent="Generar (WS)"),e&&(e.innerHTML='<span class="relative flex h-2.5 w-2.5 mr-1.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span> Conectado')}),s.WS.on("disconnected",()=>{t&&(t.disabled=!0,t.classList.replace("bg-emerald-600","bg-gray-400"),t.classList.remove("hover:bg-emerald-700"),t.classList.add("cursor-not-allowed"));let r=document.getElementById("text-engine-btn");r&&(r.textContent="Conectando..."),e&&(e.innerHTML='<span class="relative flex h-2.5 w-2.5 mr-1.5"><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span> Desconectado')}),s.WS.on("scores_updated",r=>{let n=document.getElementById("score-hard"),o=document.getElementById("score-soft"),i=document.getElementById("score-soft-tooltip-text");if(n&&(n.textContent=r.hard.toString()),o){let u=r.porcentaje!==void 0&&!isNaN(r.porcentaje)?Math.min(100,Math.max(0,r.porcentaje)).toFixed(1)+"%":"0.0%";o.textContent=u}if(i){let u=r.rawObjective||r.soft||0,p=r.bound||0;i.innerHTML=`Puntos: <b class="text-white">${u.toLocaleString()}</b> / <b class="text-indigo-400">${p.toLocaleString()}</b> pts`}let l=document.getElementById("status-conflict"),c=document.getElementById("status-ok");l&&c&&(r.hard===0?(l.classList.replace("flex","hidden"),c.classList.replace("hidden","flex")):(c.classList.replace("flex","hidden"),l.classList.replace("hidden","flex")));let d=document.getElementById("conflict-tooltip-count"),a=document.getElementById("conflict-tooltip-list");if(d&&a){let u=r.conflictos||[];d.textContent=u.length.toString(),u.length===0?a.innerHTML='<span class="text-emerald-600 font-medium">\xA1Horario matem\xE1ticamente correcto!</span>':a.innerHTML='<ul class="list-disc pl-4 space-y-1 text-red-600 font-medium">'+u.map(p=>`<li>${p}</li>`).join("")+"</ul>"}}),s.WS.on("optimization_complete",()=>{De(!0),m("\xA1Matem\xE1ticamente Correcto!","El servidor WS ha encontrado la disposici\xF3n perfecta.","success")}),s.WS.on("schedule_pushed",r=>{s.scheduledClasses=r,L()})}function De(t=!1){try{let e=document.getElementById("btn-toggle-engine");if(!e)return;let r=document.getElementById("icon-stop"),n=document.getElementById("icon-play"),o=document.getElementById("text-engine-btn");s.WS.isOptimizing||t?(s.WS.sendCommand("STOP"),e.classList.replace("bg-red-600","bg-emerald-600"),e.classList.replace("hover:bg-red-700","hover:bg-emerald-700"),e.classList.remove("animate-pulse"),r&&r.classList.add("hidden"),n&&n.classList.remove("hidden"),o&&(o.textContent="Generar (WS)")):(s.WS.sendCommand("START"),e.classList.replace("bg-emerald-600","bg-red-600"),e.classList.replace("hover:bg-red-700","hover:bg-red-700"),e.classList.add("animate-pulse"),n&&n.classList.add("hidden"),r&&r.classList.remove("hidden"),o&&(o.textContent="Parar Motor"))}catch(e){console.error("Error in toggleOptimizationEngine:",e),m("Error","No se pudo iniciar el motor de optimizaci\xF3n","error")}}function Qe(t){document.querySelectorAll(".view-tab").forEach(o=>o.classList.remove("active"));let e=document.getElementById(`view-${t}`);e&&e.classList.add("active"),document.querySelectorAll(".nav-btn").forEach(o=>{o.classList.remove("bg-indigo-600","text-white","shadow-inner"),o.classList.add("text-slate-300")});let r=document.getElementById(`nav-${t}`);r&&(r.classList.remove("text-slate-300"),r.classList.add("bg-indigo-600","text-white","shadow-inner"));let n=document.getElementById("header-calendar");n&&(n.style.display=t==="calendar"?"flex":"none"),t==="subjects"&&K(),t==="teachers"&&R(),t==="courses"&&_(),t==="assignments"&&Ie(),t==="settings"&&Le(),t==="calendar"&&setTimeout(()=>{s.calendarInstance&&s.calendarInstance.render(),X(),V()},50)}function X(){let t=document.getElementById("view-type-select"),e=document.getElementById("header-course-select"),r=document.getElementById("header-course-separator"),n=document.getElementById("view-entity-select");if(!t||!e||!n||!r)return;let o=t.value,i=e.value,l=n.value;o==="group"?(e.classList.remove("hidden"),r.classList.remove("hidden"),e.innerHTML="",s.courses.forEach(c=>e.innerHTML+=`<option value="${c.id}">${c.name}</option>`),i&&Array.from(e.options).some(c=>c.value===i)&&(e.value=i),Z(l)):(e.classList.add("hidden"),r.classList.add("hidden"),n.innerHTML="",s.teachers.forEach(c=>n.innerHTML+=`<option value="${c.id}">${c.name}</option>`),l&&Array.from(n.options).some(c=>c.value===l)&&(n.value=l),L())}function Ye(){Z(null)}async function Xe(){try{m("Copia de Seguridad","Preparando archivo de base de datos...","info");let t=await fetch("/api/v1/system/database/export");if(!t.ok)throw new Error(`Error en el servidor: ${t.statusText}`);let e=await t.blob(),r=t.headers.get("Content-Disposition"),n=`EduSchedule_Backup_${new Date().toISOString().split("T")[0]}.db`;if(r&&r.includes("filename=")){let l=r.match(/filename="?([^"]+)"?/);l&&l[1]&&(n=l[1])}let o=window.URL.createObjectURL(e),i=document.createElement("a");i.href=o,i.download=n,document.body.appendChild(i),i.click(),window.URL.revokeObjectURL(o),i.remove(),m("Copia de Seguridad",`Base de datos exportada: ${n}`,"success")}catch(t){console.error("Error al exportar base de datos:",t),m("Error",`No se pudo exportar la base de datos: ${t.message}`,"error")}}async function Ze(t){if(!t.files||t.files.length===0)return;let e=t.files[0];if(t.value="",!e.name.endsWith(".db")&&!e.name.endsWith(".sqlite")){m("Archivo no v\xE1lido","Por favor selecciona un archivo .db o .sqlite v\xE1lido.","warning");return}if(confirm(`\xBFEst\xE1s seguro de que deseas restaurar la copia de seguridad "${e.name}"?

Esta acci\xF3n reemplazar\xE1 la base de datos actual y actualizar\xE1 toda la informaci\xF3n.`))try{m("Restaurando","Validando e importando base de datos...","info");let n=new FormData;n.append("file",e);let o=await fetch("/api/v1/system/database/import",{method:"POST",body:n}),i=await o.json();if(o.ok&&i.success)m("Restauraci\xF3n Completada","La base de datos se ha restaurado con \xE9xito. Actualizando vista...","success"),await loadAllData(),L(),X();else throw new Error(i.message||"Error desconocido al importar.")}catch(n){console.error("Error al restaurar base de datos:",n),m("Error de Restauraci\xF3n",`No se pudo restaurar la base de datos: ${n.message}`,"error")}}Object.assign(window,{AppData:s,switchTab:Qe,updateEntitySelector:X,onHeaderCourseChange:Ye,toggleOptimizationEngine:De,openFormModal:fe,closeCrudModal:N,openGroupModal:be,deleteSubject:xe,deleteTeacher:ye,deleteCourse:ve,deleteGroup:Ee,updateAssignment:we,saveNewClass:ue,closeAddClassModal:J,openAddClassModal:ee,onModalCourseChange:W,openEventDetail:te,closeEventDetail:U,refreshCalendarView:L,updateDateRange:V,showToast:m,openCourseSubjects:he,openAvailabilityModal:Te,closeAvailabilityModal:ae,saveAvailability:$e,saveSettings:je,clearGroupSchedule:pe,clearGroupAssignments:Ce,clearCourseAssignments:Se,toggleAvailabilitySlot:Me,runPrevalidation:Pe,closePrevalidation:ke,toggleColorMode:me,printAllSchedules:Be,checkForUpdates:ie,exportDatabase:Xe,handleImportDatabaseFile:Ze});})();
//# sourceMappingURL=Datos.js.map
