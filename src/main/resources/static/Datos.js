(()=>{var ze=Object.defineProperty;var We=(t,e,o)=>e in t?ze(t,e,{enumerable:!0,configurable:!0,writable:!0,value:o}):t[e]=o;var R=(t,e,o)=>We(t,typeof e!="symbol"?e+"":e,o);var K=class{constructor(){R(this,"baseUrl");this.baseUrl="/api/v1"}async _fetch(e,o="GET",s=null){let n=`${this.baseUrl}/${e}`,a={method:o,headers:{"Content-Type":"application/json"}};s&&(a.body=JSON.stringify(s));let i=await fetch(n,a);if(!i.ok)throw new Error(`HTTP error! status: ${i.status}`);return o==="DELETE"?{success:!0}:await i.json()}async getConfig(){return this._fetch("config")}async saveConfig(e){return this._fetch("config","PUT",e)}async getSubjects(){return this._fetch("subjects")}async saveSubject(e){return e.id?this._fetch("subjects","PUT",e):this._fetch("subjects","POST",e)}async deleteSubject(e){return this._fetch(`subjects/${e}`,"DELETE")}async getTeachers(){return this._fetch("teachers")}async saveTeacher(e){return e.id?this._fetch("teachers","PUT",e):this._fetch("teachers","POST",e)}async deleteTeacher(e){return this._fetch(`teachers/${e}`,"DELETE")}async getCourses(){return this._fetch("courses")}async saveCourse(e){return e.id?this._fetch("courses","PUT",e):this._fetch("courses","POST",e)}async deleteCourse(e){return this._fetch(`courses/${e}`,"DELETE")}async updateCourseGroup(e,o){return this._fetch(`courses/${e}/groups`,"PUT",o)}async getSchedule(){return this._fetch("scheduledClasses")}async saveClass(e){return this._fetch("scheduledClasses","POST",e)}async updateClass(e){return this._fetch("scheduledClasses","PUT",e)}async deleteClass(e){return this._fetch(`scheduledClasses/${e}`,"DELETE")}async deleteGroupSchedule(e){return this._fetch(`scheduledClasses/group/${e}`,"DELETE")}async getPrevalidation(){return this._fetch("prevalidation")}};function g(t,e,o="info"){let s=document.getElementById("toast-container");if(!s)return;let n=document.createElement("div"),a=o==="error"?"border-red-500 text-red-500":o==="success"?"border-green-500 text-green-500":o==="warning"?"border-yellow-500 text-yellow-500":"border-blue-500 text-blue-500";n.className=`bg-white border-l-4 ${a} shadow-lg rounded-r-lg p-4 w-80 transform transition-all duration-300 translate-y-4 opacity-0 flex gap-3`,n.innerHTML=`<div><h4 class="text-sm font-bold text-gray-800">${t}</h4><p class="text-xs text-gray-600 mt-1">${e}</p></div>`,s.appendChild(n),setTimeout(()=>n.classList.remove("translate-y-4","opacity-0"),10),setTimeout(()=>{n.classList.add("opacity-0","translate-x-full"),setTimeout(()=>n.remove(),300)},4e3)}function H(t){return Number(t.toFixed(2)).toString()}var Q=class{constructor(){R(this,"isConnected");R(this,"isOptimizing");R(this,"wsUrl");R(this,"callbacks");R(this,"socket");this.wsUrl=(window.location.protocol==="https:"?"wss://":"ws://")+window.location.host+"/ws",this.isConnected=!1,this.isOptimizing=!1,this.callbacks={},this.socket=null}connect(){this.socket=new WebSocket(this.wsUrl),this.socket.onopen=()=>{this.isConnected=!0,this._trigger("connected")},this.socket.onclose=()=>{this.isConnected=!1,this._trigger("disconnected"),setTimeout(()=>this.connect(),5e3)},this.socket.onerror=e=>{console.error("WebSocket error:",e)},this.socket.onmessage=e=>{try{let o=JSON.parse(e.data);o.type==="scores_updated"?this._trigger("scores_updated",o):o.type==="schedule_pushed"?this._trigger("schedule_pushed",o.schedule):o.type==="optimization_complete"?this._trigger("optimization_complete"):o.type==="optimization_stopped"&&(this.isOptimizing=!1)}catch(o){console.error("Error parsing WS message:",o)}}}on(e,o){this.callbacks[e]=o}_trigger(e,o){this.callbacks[e]&&this.callbacks[e](o)}sendCommand(e,o={}){try{if(!this.isConnected||!this.socket){g("Error","WebSocket Desconectado","error");return}this.socket.send(JSON.stringify({command:e,payload:o})),e==="START"?(this.isOptimizing=!0,g("Motor Iniciado","Servidor analizando el \xE1rbol de posibilidades (WS)...","info")):e==="STOP"&&(this.isOptimizing=!1,g("Motor Pausado","Optimizaci\xF3n detenida.","warning"))}catch(s){throw console.error("Error sending WS command:",s),g("Error de Comunicaci\xF3n","No se pudo enviar el comando al servidor","error"),s}}};function Y(){if(!r.calendarInstance)return;let t=r.calendarInstance.getDateRangeStart(),e=r.calendarInstance.getDateRangeEnd(),o=n=>{let a=typeof n.toDate=="function"?n.toDate():new Date(n),i=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];return`${a.getDate()} ${i[a.getMonth()]}`},s=document.getElementById("calendar-date-range");s&&(s.textContent=`${o(t)} - ${o(e)}`)}function re(t=null){let e=document.getElementById("header-course-select"),o=document.getElementById("view-entity-select");if(!e||!o)return;let s=e.value,n=r.courses.find(a=>a.id===s);n?n.groups.length===0?o.innerHTML='<option value="">Sin grupos</option>':o.innerHTML=n.groups.map(a=>`<option value="${a.id}">Grupo ${a.name}</option>`).join(""):o.innerHTML="",t&&Array.from(o.options).some(a=>a.value===t)&&(o.value=t),T()}function be(){if(typeof tui>"u")return;let t=tui.Calendar;r.calendarInstance=new t("#calendar",{defaultView:"week",useFormPopup:!1,useDetailPopup:!1,week:{taskView:!1,eventView:["time"],dayNames:["Dom","Lunes","Martes","Mi\xE9rcoles","Jueves","Viernes","S\xE1b"],workweek:!0,hourStart:8,hourEnd:15},calendars:[{id:"default",name:"Clases",backgroundColor:"#4f46e5"},{id:"pinned",name:"Fijadas",backgroundColor:"#059669"},{id:"recess",name:"Recreo",backgroundColor:"#f1f5f9",borderColor:"#94a3b8",color:"#64748b"}],template:{weekDayName(e){return`<span class="toastui-calendar-day-name-item">${e.dayName}</span>`},time(e){return e.calendarId==="recess"?'<div class="p-1 font-semibold text-slate-500 text-xs">\u2615 Recreo</div>':`
                    <div class="p-1 flex flex-col justify-center h-full overflow-hidden text-white leading-tight">
                        <div class="font-bold text-xs truncate">${e.title}</div>
                        ${e.body?`<div class="text-[11px] font-medium opacity-90 truncate mt-0.5">${e.body}</div>`:""}
                    </div>
                `}}}),ye(),r.calendarInstance.on("selectDateTime",function(e){r.calendarInstance.clearGridSelections();let o=typeof e.start.toDate=="function"?e.start.toDate():new Date(e.start),s=typeof e.end.toDate=="function"?e.end.toDate():new Date(e.end);se(o,s)}),r.calendarInstance.on("beforeUpdateEvent",async function(e){let{event:o,changes:s}=e,n=r.currentMergedEvents?.find(u=>u.id===o.id||u.mergedIds&&u.mergedIds.includes(o.id)),a=[];if(n&&n.mergedIds)a=r.scheduledClasses.filter(u=>n.mergedIds.includes(u.id));else{let u=r.scheduledClasses.find(m=>m.id===o.id);u&&(a=[u])}if(a.length===0)return;if(a.some(u=>u.isPinned)){g("Bloqueado","No puedes mover ni alterar una clase que est\xE1 fijada (Pin).","warning");return}let i=n?n.start:a[0].start,d=n?n.end:a[a.length-1].end;if(s.start&&(i=typeof s.start.toDate=="function"?s.start.toDate():new Date(s.start)),s.end&&(d=typeof s.end.toDate=="function"?s.end.toDate():new Date(s.end)),ae(new Date(i),new Date(d))){g("Error","No se puede programar una clase durante el recreo (12:00 - 12:30).","error"),T();return}g("Sincronizando...","Guardando nueva posici\xF3n en el servidor...","info"),a.sort((u,m)=>new Date(u.start).getTime()-new Date(m.start).getTime());let l=new Date(i);for(let u of a){let m=u.duration||.5,p=m*36e5,c=new Date(l.getTime()+p);u.start=l.toISOString(),u.end=c.toISOString(),u.duration=m,await r.API.updateClass(u),r.WS.sendCommand("MANUAL_EDIT",{id:u.id,action:"moved"}),l=c}T()}),r.calendarInstance.on("clickEvent",e=>ne(e.event))}function se(t=null,e=null){if(!t){let f=new Date,b=f.getDate()-f.getDay()+(f.getDay()===0?-6:1);t=new Date(f.setDate(b)),t.setHours(9,0,0,0),e=new Date(t),e.setHours(10,0,0,0)}let o=f=>f.toTimeString().slice(0,5);document.getElementById("modal-class-start").value=t.toISOString(),document.getElementById("modal-class-end").value=e.toISOString(),document.getElementById("modal-time-start").value=o(t),document.getElementById("modal-time-end").value=o(e);let s=document.getElementById("view-type-select"),n=document.getElementById("header-course-select"),a=document.getElementById("view-entity-select"),i=s?.value,d=n?.value,l=a?.value,u=document.getElementById("modal-subject"),m=document.getElementById("modal-course"),p=document.getElementById("modal-group"),c=document.getElementById("modal-teacher");if(u.innerHTML=r.subjects.map(f=>{let b=r.courses.find(I=>I.subjects.includes(f.id)),E=b?` (${b.name})`:"";return`<option value="${f.id}">${f.name}${E}</option>`}).join(""),m.innerHTML=r.courses.map(f=>`<option value="${f.id}">${f.name}</option>`).join(""),c.innerHTML=r.teachers.map(f=>`<option value="${f.id}">${f.name}</option>`).join(""),m.disabled=!1,p.disabled=!1,c.disabled=!1,i==="group"&&d)m.value=d,m.disabled=!0,q(),l&&(p.value=l,p.disabled=!0);else if(i==="teacher"&&l){c.value=l,c.disabled=!0,q();let f=r.teachers.find(b=>b.id===l);f&&f.subjects&&f.subjects.length>0&&(u.value=f.subjects[0])}else q();let x=document.getElementById("modal-is-pinned");x&&(x.checked=!1);let v=document.getElementById("add-class-modal");v&&(v.classList.replace("hidden","flex"),v.onclick=f=>{f.target===v&&X()})}function q(){let t=document.getElementById("modal-course").value,e=document.getElementById("modal-group"),o=r.courses.find(s=>s.id===t);o&&o.groups.length>0?e.innerHTML=o.groups.map(s=>`<option value="${s.id}">Grupo ${s.name}</option>`).join(""):e.innerHTML='<option value="">(Sin grupos)</option>'}function X(){let t=document.getElementById("add-class-modal");t&&t.classList.replace("flex","hidden")}async function he(){let t=document.getElementById("modal-class-start").value,e=document.getElementById("modal-class-end").value,o=new Date(t),s=new Date(e),n=document.getElementById("modal-time-start").value.split(":"),a=document.getElementById("modal-time-end").value.split(":");o.setHours(parseInt(n[0]),parseInt(n[1]),0,0),s.setHours(parseInt(a[0]),parseInt(a[1]),0,0);let i=document.getElementById("modal-subject").value,d=document.getElementById("modal-group").value,l=document.getElementById("modal-teacher").value;if(!d||!l){g("Error","Faltan datos por seleccionar (Grupo o Profesor)","error");return}if(ae(o,s)){g("Error","No se puede programar una clase durante el recreo (12:00 - 12:30).","error");return}let u=s.getTime()-o.getTime(),m=30,p=Math.max(1,Math.round(u/(m*6e4))),c=document.getElementById("modal-is-pinned")?.checked??!1;g("Guardando...","Enviando bloque a la base de datos API","info");for(let x=0;x<p;x++){let v=new Date(o.getTime()+x*m*6e4),f=new Date(v.getTime()+m*6e4),b={id:"evt-"+Date.now()+"-"+x,start:v.toISOString(),end:f.toISOString(),duration:.5,subjectId:i,groupId:d,teacherId:l,isPinned:c};await r.API.saveClass(b),r.scheduledClasses.push(b),r.WS.sendCommand("MANUAL_EDIT",{id:b.id})}X(),T()}var fe=["#4f46e5","#0284c7","#059669","#d97706","#dc2626","#7c3aed","#db2777","#2563eb","#0d9488","#ca8a04","#ea580c","#e11d48","#9333ea","#16a34a"];function V(t){if(!t)return"#4f46e5";let e=0;for(let s=0;s<t.length;s++)e=t.charCodeAt(s)+((e<<5)-e);let o=Math.abs(e)%fe.length;return fe[o]}function xe(){r.colorMode||(r.colorMode="teacher"),r.colorMode=r.colorMode==="teacher"?"subject":"teacher";let t=document.getElementById("btn-color-mode-text");t&&(t.textContent=r.colorMode==="teacher"?"Color: Profesor":"Color: Asignatura");let e=document.getElementById("btn-color-mode-icon");e&&(e.textContent=r.colorMode==="teacher"?"\u{1F3A8}":"\u{1F4DA}"),T()}function Ue(t,e,o,s="teacher",n={}){let{maxBlockDuration:a=2,recessConfig:i=r.config?{start:r.config.horaInicioRecreo,duration:r.config.duracionRecreo}:{start:"12:00",duration:30}}=n;if(!Array.isArray(t)||t.length===0)return[];let d=t.filter(m=>e==="teacher"?m.teacherId===o:e==="group"?m.groupId===o:!1),l=new Map;d.forEach(m=>{let p=new Date(m.start),x=`${`${p.getFullYear()}-${String(p.getMonth()+1).padStart(2,"0")}-${String(p.getDate()).padStart(2,"0")}`}_${m.subjectId}_${m.teacherId}_${m.groupId}`;l.has(x)||l.set(x,[]),l.get(x).push(m)});let u=[];return l.forEach(m=>{m.sort((c,x)=>new Date(c.start).getTime()-new Date(x.start).getTime());let p=0;for(;p<m.length;){let c=m[p],x=[c.id],v=c.start,f=c.end,b=c.duration||(new Date(c.end).getTime()-new Date(c.start).getTime())/36e5,E=!!c.isPinned,I=p+1;for(;I<m.length;){let S=m[I],k=new Date(f).getTime(),A=new Date(S.start).getTime(),$=Math.abs(k-A)<6e4,P=S.duration||(new Date(S.end).getTime()-new Date(S.start).getTime())/36e5,j=ae(new Date(v),new Date(S.end),i);if($&&!j&&b+P<=a+.01)f=S.end,b+=P,x.push(S.id),S.isPinned&&(E=!0),I++;else break}let h=r.subjects.find(S=>S.id===c.subjectId),y=r.teachers.find(S=>S.id===c.teacherId),w=r.courses.find(S=>S.groups.some(k=>k.id===c.groupId)),C=w?w.groups.find(S=>S.id===c.groupId):null,M=E?"\u{1F4CC} ":"",L=h?`${M}${h.name}`:`${M}Clase API`,B=e==="group"?y?`Prof: ${y.name}`:"":w&&C?`${w.name} - G.${C.name}`:y?`Prof: ${y.name}`:"",D=s==="subject"?V(c.subjectId):y?y.color:"#4f46e5";u.push({id:c.id,mergedIds:[...x],calendarId:c.teacherId,title:L,body:B,start:v,end:f,duration:Math.round(b*100)/100,isReadOnly:E,isPinned:E,backgroundColor:D,color:"#ffffff",customStyle:{borderRadius:"6px",border:"none",padding:"2px"},raw:{subjectId:c.subjectId,teacherId:c.teacherId,groupId:c.groupId}}),p=I}}),u}function T(){let t=document.getElementById("view-type-select"),e=document.getElementById("view-entity-select");if(!t||!e)return;let o=t.value,s=e.value;if(r.calendarInstance&&(r.calendarInstance.clear(),ye()),!s)return;let n=r.colorMode||"teacher",a=Ue(r.scheduledClasses,o,s,n);r.currentMergedEvents=a,r.calendarInstance&&r.calendarInstance.createEvents(a);let i=document.getElementById("teacher-summary-card"),d=document.getElementById("teacher-summary-content");if(o==="teacher"&&s){let l=r.teachers.find(u=>u.id===s);if(l&&i&&d){let u=r.scheduledClasses.filter(f=>f.teacherId===s),m=u.reduce((f,b)=>f+b.duration,0),p=new Map;u.forEach(f=>{let b=r.subjects.find(M=>M.id===f.subjectId),E=r.courses.find(M=>M.groups.some(L=>L.id===f.groupId)),I=E?E.groups.find(M=>M.id===f.groupId):null,h=E?E.name:"Curso",y=I?I.name:"Grupo",w=b?b.name:"Asignatura",C=`${h}_${y}_${w}`;p.has(C)||p.set(C,{courseName:h,groupName:y,subjectName:w,hours:0}),p.get(C).hours+=f.duration});let c=l.maxHours||(r.config?Math.round(r.config.minutosMaximosProfesor/60):25),x=Array.from(p.values()),v=`
                <div class="flex flex-wrap items-center justify-between gap-4 mb-3 border-b border-gray-100 pb-2">
                    <div class="flex items-center gap-2">
                        <span class="w-3.5 h-3.5 rounded-full shadow-sm" style="background-color: ${l.color};"></span>
                        <h4 class="font-bold text-gray-800 text-sm">Resumen Docente: ${l.name}</h4>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500 font-medium">Carga Lectiva Asignada:</span>
                        <span class="text-xs font-bold px-2.5 py-1 ${m<=c?"bg-emerald-50 text-emerald-700 border border-emerald-200":"bg-amber-50 text-amber-700 border border-amber-200"} rounded-full">
                            ${m.toFixed(1)}h / ${c}h max
                        </span>
                    </div>
                </div>
            `;x.length===0?v+='<p class="text-xs text-gray-400 italic">No tiene clases asignadas en el horario actual.</p>':v+='<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">'+x.map(f=>`
                        <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between hover:bg-slate-100 transition-colors">
                            <span class="text-xs font-bold text-slate-800 truncate">${f.courseName} - G.${f.groupName}</span>
                            <div class="flex justify-between items-center mt-1 text-[11px]">
                                <span class="text-indigo-600 font-semibold truncate">${f.subjectName}</span>
                                <span class="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">${f.hours.toFixed(1)}h</span>
                            </div>
                        </div>
                    `).join("")+"</div>",d.innerHTML=v,i.classList.remove("hidden")}}else i&&i.classList.add("hidden")}function ne(t){let e=r.currentMergedEvents?.find(h=>h.id===t.id||h.mergedIds&&h.mergedIds.includes(t.id)),o=[];if(e&&e.mergedIds)o=r.scheduledClasses.filter(h=>e.mergedIds.includes(h.id));else{let h=r.scheduledClasses.find(y=>y.id===t.id);h&&(o=[h])}if(o.length===0)return;let s=o[0],n=r.subjects.find(h=>h.id===s.subjectId),a=r.teachers.find(h=>h.id===s.teacherId);if(!n||!a)return;let i=o.reduce((h,y)=>h+(y.duration||.5),0),d=o.some(h=>h.isPinned),l=r.courses.find(h=>h.groups.some(y=>y.id===s.groupId)),u=l?l.groups.find(h=>h.id===s.groupId):null,m=l&&u?`${l.name} - Grupo ${u.name}`:"Sin grupo",p=document.getElementById("event-detail-title");p&&(p.textContent=`${n.name} (${H(i)}h)`);let x=(r.colorMode||"teacher")==="subject"?V(s.subjectId):a.color,v=document.getElementById("event-detail-header");v&&(v.style.backgroundColor=x);let f=document.getElementById("event-detail-body");if(f){let h=new Date(e?e.start:s.start).toTimeString().slice(0,5),y=new Date(e?e.end:o[o.length-1].end).toTimeString().slice(0,5);f.innerHTML=`
            <p class="text-sm mb-1.5">Curso/Grupo: <b>${m}</b></p>
            <p class="text-sm mb-1.5">Impartida por: <b>${a.name}</b></p>
            <p class="text-xs text-gray-500">Horario: <b>${h} - ${y}</b> (${H(i)}h)</p>
        `}let b=document.getElementById("btn-pin-event");b&&(b.innerText=d?"Desfijar":"Fijar (Pin)",b.onclick=async()=>{let h=!d;for(let y of o){y.isPinned=h;try{await r.API.updateClass(y)}catch(w){console.error("Error al actualizar estado del pin:",w)}r.WS.sendCommand("PIN_UPDATE",{id:y.id,state:y.isPinned})}F(),T()});let E=document.getElementById("btn-delete-event");E&&(E.onclick=async()=>{for(let h of o)await r.API.deleteClass(h.id),r.scheduledClasses=r.scheduledClasses.filter(y=>y.id!==h.id),r.WS.sendCommand("MANUAL_EDIT",{delete:h.id});F(),T()});let I=document.getElementById("event-detail-modal");I&&(I.classList.replace("hidden","flex"),I.onclick=h=>{h.target===I&&F()})}function F(){let t=document.getElementById("event-detail-modal");t&&t.classList.replace("flex","hidden")}function ae(t,e,o){let s=new Date(t),n=new Date(e),a=s.getHours(),i=s.getMinutes(),d=n.getHours(),l=n.getMinutes(),u=a*60+i,m=d*60+l,p=720,c=30;if(o){if(typeof o.start=="string"){let v=o.start.split(":").map(Number);p=v[0]*60+v[1]}typeof o.duration=="number"&&(c=o.duration)}else if(r.config){let v=r.config.horaInicioRecreo.split(":");p=parseInt(v[0])*60+parseInt(v[1]),c=r.config.duracionRecreo}let x=p+c;return u<x&&m>p}function ye(){if(!r.calendarInstance)return;let t=new Date,e=t.getDay(),o=t.getDate()-e+(e===0?-6:1),s=new Date(t);s.setDate(o),s.setHours(0,0,0,0);let n=12,a=0,i=30;if(r.config){let d=r.config.horaInicioRecreo.split(":");n=parseInt(d[0]),a=parseInt(d[1]),i=r.config.duracionRecreo}for(let d=0;d<5;d++){let l=new Date(s);l.setDate(s.getDate()+d);let u=new Date(l);u.setHours(n,a,0,0);let m=new Date(u);m.setMinutes(u.getMinutes()+i),r.calendarInstance.createEvents([{id:`recess-${d}`,calendarId:"recess",title:"\u2615 Recreo",start:u.toISOString(),end:m.toISOString(),isReadOnly:!0,isAllDay:!1,backgroundColor:"#f1f5f9",borderColor:"#94a3b8",color:"#64748b"}])}}async function ve(){let t=document.getElementById("view-type-select"),e=document.getElementById("view-entity-select");if(!t||!e)return;if(t.value!=="group"){g("Info","Por favor, selecciona la vista de 'Grupo' para vaciar un horario espec\xEDfico.","info");return}let o=e.value;if(!o){g("Info","No hay ning\xFAn grupo seleccionado.","info");return}let s=r.courses.flatMap(a=>a.groups).find(a=>a.id===o),n=s?s.name:"este grupo";if(confirm(`\xBFEst\xE1s seguro de que deseas vaciar todas las clases programadas para el grupo "${n}"?`))try{g("Limpiando...","Eliminando clases de la base de datos...","info"),await r.API.deleteGroupSchedule(o),r.scheduledClasses=r.scheduledClasses.filter(a=>a.groupId!==o),T(),g("\xC9xito","El horario del grupo se ha vaciado.","success"),r.WS.sendCommand("MANUAL_EDIT",{action:"cleared",groupId:o})}catch(a){console.error("Error clearing schedule:",a),g("Error","No se pudo limpiar el horario.","error")}}var qe="",_=null,ie="",de=null;function Ee(t,e=null){qe=t,_=e;let o=document.getElementById("crud-modal-title"),s=document.getElementById("crud-modal-body");if(!o||!s)return;if(t==="subject"){o.textContent=e?"Editar Asignatura":"Nueva Asignatura";let i=e?r.subjects.find(l=>l.id===e):null,d=r.currentCourseId;s.innerHTML=`
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Asignatura</label>
                    <input type="text" id="crud-subject-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${i?.name||""}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Horas Semanales</label>
                    <input type="number" id="crud-subject-hours" required min="0.5" step="0.5" class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${i?.hours||4}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Curso Asociado</label>
                    <select id="crud-subject-course" disabled required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none bg-gray-100 cursor-not-allowed">
                        ${r.courses.map(l=>`<option value="${l.id}" ${l.id===(i?.courseId||d)?"selected":""}>${l.name}</option>`).join("")}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Profesores Cualificados (Especialistas)</label>
                    <div class="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                        ${r.teachers.map(l=>{let u=i?.teachers?.includes(l.id)||!1;return`
                                <label class="flex items-center gap-2 cursor-pointer text-sm">
                                    <input type="checkbox" name="crud-subject-teachers" value="${l.id}" ${u?"checked":""} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                    <span>${l.name}</span>
                                </label>
                            `}).join("")}
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow animate-fade-in">Guardar</button>
                </div>
            </form>
        `}else if(t==="teacher"){o.textContent=e?"Editar Profesor":"Nuevo Profesor";let i=e?r.teachers.find(d=>d.id===e):null;s.innerHTML=`
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Profesor</label>
                    <input type="text" id="crud-teacher-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${i?.name||""}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Horas M\xE1ximas Semanales</label>
                    <input type="number" id="crud-teacher-max-hours" required min="0.5" step="0.5" class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${i?.maxHours||22.5}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Color Identificativo</label>
                    <div class="flex gap-2 items-center">
                        <input type="color" id="crud-teacher-color" required class="w-10 h-10 border border-gray-300 rounded cursor-pointer" value="${i?.color||"#4f46e5"}">
                        <span class="text-xs text-gray-500">Color visual en el calendario.</span>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Especialidades (Materias habilitadas)</label>
                    <div class="border border-gray-300 rounded-lg p-3 max-h-56 overflow-y-auto space-y-3 bg-gray-50">
                        ${r.courses.map(d=>{let l=r.subjects.filter(u=>d.subjects.includes(u.id));return l.length===0?"":`
                                <div class="space-y-1.5">
                                    <div class="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded inline-block">
                                        \u{1F4DA} ${d.name}
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                                        ${l.map(u=>`
                                            <label class="flex items-center gap-2 cursor-pointer text-sm hover:bg-white p-1 rounded transition-colors">
                                                <input type="checkbox" name="crud-teacher-subjects" value="${u.id}" ${i?.subjects.includes(u.id)?"checked":""} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                                <span class="truncate font-medium text-gray-700">${u.name} <span class="text-xs text-gray-400 font-normal">(${H(u.hours)}h)</span></span>
                                            </label>
                                        `).join("")}
                                    </div>
                                </div>
                            `}).join("")}
                        ${(()=>{let d=r.subjects.filter(l=>!r.courses.some(u=>u.subjects.includes(l.id)));return d.length===0?"":`
                                <div class="space-y-1.5">
                                    <div class="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-200 px-2 py-0.5 rounded inline-block">
                                        Otras Asignaturas
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                                        ${d.map(l=>`
                                            <label class="flex items-center gap-2 cursor-pointer text-sm hover:bg-white p-1 rounded transition-colors">
                                                <input type="checkbox" name="crud-teacher-subjects" value="${l.id}" ${i?.subjects.includes(l.id)?"checked":""} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                                <span class="truncate font-medium text-gray-700">${l.name} <span class="text-xs text-gray-400 font-normal">(${H(l.hours)}h)</span></span>
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
        `}else if(t==="course"){o.textContent=e?"Editar Curso":"Nuevo Curso";let i=e?r.courses.find(d=>d.id===e):null;s.innerHTML=`
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Curso</label>
                    <input type="text" id="crud-course-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${i?.name||""}">
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
                </div>
            </form>
        `}let n=document.getElementById("crud-modal");n&&n.classList.replace("hidden","flex");let a=document.getElementById("form-crud");a&&(a.onsubmit=async i=>{if(i.preventDefault(),t==="subject"){let d=document.getElementById("crud-subject-name").value,l=parseFloat(document.getElementById("crud-subject-hours").value),u=r.currentCourseId,m=document.querySelectorAll('input[name="crud-subject-teachers"]:checked'),p=Array.from(m).map(c=>c.value);try{await r.API.saveSubject({id:_||void 0,name:d,hours:l,courseId:u,teachers:p}),g("\xC9xito","Asignatura guardada correctamente","success"),G(),Z()}catch{g("Error","No se pudo guardar la asignatura","error")}}else if(t==="teacher"){let d=document.getElementById("crud-teacher-name").value,l=parseFloat(document.getElementById("crud-teacher-max-hours").value),u=document.getElementById("crud-teacher-color").value,m=document.querySelectorAll('input[name="crud-teacher-subjects"]:checked'),p=Array.from(m).map(c=>c.value);try{let c=_?r.teachers.find(v=>v.id===_):null,x=c?c.availability:[];await r.API.saveTeacher({id:_||void 0,name:d,maxHours:l,color:u,subjects:p,availability:x}),g("\xC9xito","Profesor guardado correctamente","success"),G(),O()}catch{g("Error","No se pudo guardar el profesor","error")}}else if(t==="course"){let d=document.getElementById("crud-course-name").value;try{await r.API.saveCourse({id:_||void 0,name:d}),g("\xC9xito","Curso guardado correctamente","success"),G(),z()}catch{g("Error","No se pudo guardar el curso","error")}}})}function Ie(t,e=null){ie=t,de=e;let o=r.courses.find(l=>l.id===t);if(!o)return;let s=e?o.groups.find(l=>l.id===e):null,n=document.getElementById("crud-modal-title");n&&(n.textContent=e?"Editar Grupo":"Nuevo Grupo");let a=document.getElementById("crud-modal-body");if(!a)return;a.innerHTML=`
        <form id="form-group-crud" class="space-y-4">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Grupo (Letra/Identificador)</label>
                <input type="text" id="crud-group-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${s?.name||""}">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Tutor del Grupo</label>
                <select id="crud-group-tutor" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    ${r.teachers.map(l=>`<option value="${l.id}" ${s?.tutorId===l.id?"selected":""}>${l.name}</option>`).join("")}
                </select>
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
            </div>
        </form>
    `;let i=document.getElementById("crud-modal");i&&i.classList.replace("hidden","flex");let d=document.getElementById("form-group-crud");d&&(d.onsubmit=async l=>{l.preventDefault();let u=document.getElementById("crud-group-name").value,m=document.getElementById("crud-group-tutor").value;try{let p=r.courses.find(c=>c.id===ie);if(!p)return;if(de){let c=p.groups.find(x=>x.id===de);c&&(c.name=u,c.tutorId=m)}else{let c={id:"temp-"+Date.now(),name:u,tutorId:m,assignments:{}};p.groups.push(c)}await r.API.updateCourseGroup(ie,p.groups),g("\xC9xito","Grupo guardado correctamente","success"),G(),z()}catch{g("Error","No se pudo guardar el grupo","error")}})}function G(){let t=document.getElementById("crud-modal");t&&t.classList.replace("flex","hidden")}function we(t){r.currentCourseId=t,window.switchTab("subjects")}async function Z(){try{r.subjects=await r.API.getSubjects(),r.courses=await r.API.getCourses();let t=r.currentCourseId,e=document.getElementById("view-subjects-title");if(e){let n=r.courses.find(a=>a.id===t);e.textContent=n?`Asignaturas de ${n.name}`:"Gesti\xF3n de Asignaturas"}let o=document.getElementById("table-subjects");if(!o)return;if(!t){o.innerHTML='<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">Por favor, selecciona un curso primero.</td></tr>';return}let s=r.subjects.filter(n=>n.courseId===t);if(s.length===0){o.innerHTML='<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">No hay asignaturas en este curso.</td></tr>';return}o.innerHTML=s.map(n=>`
            <tr class="hover:bg-gray-50 border-b border-gray-100 text-sm">
                <td class="p-4 font-medium text-gray-800">${n.name}</td>
                <td class="p-4 text-center text-gray-600">${H(n.hours)} h</td>
                <td class="p-4 text-center">
                    <button onclick="openFormModal('subject', '${n.id}')" class="text-indigo-600 hover:text-indigo-900 font-semibold mr-3">Editar</button>
                    <button onclick="deleteSubject('${n.id}')" class="text-red-600 hover:text-red-900 font-semibold">Eliminar</button>
                </td>
            </tr>
        `).join("")}catch(t){console.error(t),g("Error","No se pudieron cargar las asignaturas","error")}}async function Ce(t){if(confirm("\xBFEst\xE1s seguro de que deseas eliminar esta asignatura?"))try{await r.API.deleteSubject(t),g("\xC9xito","Asignatura eliminada correctamente","success"),Z()}catch{g("Error","No se pudo eliminar la asignatura","error")}}async function O(){try{r.teachers=await r.API.getTeachers();let t=document.getElementById("list-teachers");if(!t)return;t.innerHTML=r.teachers.map(e=>{let o=e.subjects.map(s=>{let n=r.subjects.find(i=>i.id===s);if(!n)return"";let a=r.courses.find(i=>i.subjects.includes(s));return a?`${n.name} (${a.name})`:n.name}).filter(s=>s!=="").join(", ");return`
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold text-gray-800 text-lg">${e.name}</h3>
                            <span class="w-4 h-4 rounded-full border border-gray-300" style="background-color: ${e.color}"></span>
                        </div>
                        <p class="text-sm text-gray-500 mb-1">Max: <b>${H(e.maxHours)} h / semana</b></p>
                        <p class="text-xs text-gray-600 mt-2 italic truncate" title="${o||"Sin especialidades"}">
                            Especialidades: ${o||"Ninguna"}
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
                        <button onclick="openAvailabilityModal('${e.id}')" class="text-emerald-600 hover:text-emerald-800 text-xs font-semibold mr-auto flex items-center gap-1">\u{1F4C5} Disponibilidad</button>
                        <button onclick="openFormModal('teacher', '${e.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-semibold">Editar</button>
                        <button onclick="deleteTeacher('${e.id}')" class="text-red-600 hover:text-red-900 text-xs font-semibold">Eliminar</button>
                    </div>
                </div>
            `}).join("")}catch(t){console.error(t),g("Error","No se pudieron cargar los profesores","error")}}async function Se(t){if(confirm("\xBFEst\xE1s seguro de que deseas eliminar este profesor?"))try{await r.API.deleteTeacher(t),g("\xC9xito","Profesor eliminado correctamente","success"),O()}catch{g("Error","No se pudo eliminar al profesor","error")}}async function z(){try{r.courses=await r.API.getCourses(),r.teachers=await r.API.getTeachers();let t=document.getElementById("list-courses");if(!t)return;t.innerHTML=r.courses.map(e=>{let o="";return e.groups.length===0?o='<p class="text-xs text-gray-400 italic">No hay grupos creados en este curso.</p>':o=`
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        ${e.groups.map(s=>{let n=r.teachers.find(a=>a.id===s.tutorId);return`
                                <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                                    <div>
                                        <h4 class="font-semibold text-gray-700 text-sm">Grupo ${s.name}</h4>
                                        <p class="text-xs text-gray-500">Tutor: ${n?n.name:"Sin asignar"}</p>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="openGroupModal('${e.id}', '${s.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold">Editar</button>
                                        <button onclick="deleteGroup('${e.id}', '${s.id}')" class="text-red-600 hover:text-red-900 text-xs font-bold">Borrar</button>
                                    </div>
                                </div>
                            `}).join("")}
                    </div>
                `,`
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
                    ${o}
                </div>
            `}).join("")}catch(t){console.error(t),g("Error","No se pudieron cargar los cursos","error")}}async function Me(t){if(confirm("\xBFEst\xE1s seguro de que deseas eliminar este curso y todos sus grupos?"))try{await r.API.deleteCourse(t),g("\xC9xito","Curso eliminado correctamente","success"),z()}catch{g("Error","No se pudo eliminar el curso","error")}}async function Te(t,e){if(confirm("\xBFEst\xE1s seguro de que deseas eliminar este grupo?"))try{let o=r.courses.find(n=>n.id===t);if(!o)return;let s=o.groups.filter(n=>n.id!==e);await r.API.updateCourseGroup(t,s),g("\xC9xito","Grupo eliminado correctamente","success"),z()}catch{g("Error","No se pudo eliminar el grupo","error")}}async function $e(){let t=document.getElementById("assignments-list");if(t){t.innerHTML="";try{if(r.courses=await r.API.getCourses(),r.subjects=await r.API.getSubjects(),r.teachers=await r.API.getTeachers(),r.courses.length===0){t.innerHTML='<div class="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 italic">No hay asignaciones cargadas. Cree cursos y grupos primero.</div>';return}let e=r.courses.filter(o=>o.groups.length>0);if(e.length===0){t.innerHTML='<div class="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 italic">No hay grupos creados en los cursos. Cree grupos primero.</div>';return}t.innerHTML=e.map(o=>{let s=r.subjects.filter(a=>a.courseId===o.id),n=o.groups.map(a=>{let i="";return s.length===0?i='<p class="text-xs text-gray-400 italic py-2">No hay asignaturas en este curso.</p>':i=s.map(d=>{let l=a.assignments[d.id]||"",u=r.teachers.filter(m=>m.subjects.includes(d.id));return`
                            <div class="flex flex-col gap-1.5 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                                <span class="text-sm font-semibold text-gray-700 truncate block" title="${d.name}">${d.name} (${H(d.hours)}h)</span>
                                <select onchange="updateAssignment('${o.id}', '${a.id}', '${d.id}', this.value)" class="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white hover:border-slate-400 focus:border-indigo-500 outline-none transition-colors">
                                    <option value="">-- Sin asignar --</option>
                                    ${r.teachers.map(m=>{let c=u.some(x=>x.id===m.id)?m.name:`${m.name} (No especialista)`;return`<option value="${m.id}" ${l===m.id?"selected":""}>${c}</option>`}).join("")}
                                </select>
                            </div>
                        `}).join(""),`
                    <div id="group-card-${o.id}-${a.id}" class="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
                        <div class="flex items-center justify-between border-b pb-2">
                            <h4 class="font-bold text-gray-800 text-sm">Grupo ${a.name}</h4>
                            <button onclick="clearGroupAssignments('${o.id}', '${a.id}')" class="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-0.5" title="Poner todas las asignaturas de este grupo sin asignar">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                Vaciar Grupo
                            </button>
                        </div>
                        <div class="space-y-3">
                            ${i}
                        </div>
                    </div>
                `}).join("");return`
                <div id="course-card-${o.id}" class="mb-8 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <div class="flex items-center justify-between border-b pb-2">
                        <h3 class="font-bold text-gray-800 text-lg">${o.name}</h3>
                        <button onclick="clearCourseAssignments('${o.id}')" class="text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200 transition-colors" title="Poner todas las asignaciones de todos los grupos de este curso sin asignar">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            Vaciar Curso
                        </button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${n}
                    </div>
                </div>
            `}).join("")}catch(e){console.error(e),g("Error","No se pudieron cargar las asignaciones","error")}}}async function Le(t,e,o,s){try{let n=r.courses.find(i=>i.id===t);if(!n)return;let a=n.groups.find(i=>i.id===e);if(!a)return;s===""?delete a.assignments[o]:a.assignments[o]=s,await r.API.updateCourseGroup(t,n.groups),g("\xC9xito","Asignaci\xF3n actualizada","success")}catch{g("Error","No se pudo guardar la asignaci\xF3n","error")}}async function je(t,e){try{let o=r.courses.find(a=>a.id===t);if(!o)return;let s=o.groups.find(a=>a.id===e);if(!s||!confirm(`\xBFEst\xE1s seguro de que deseas poner todas las asignaturas del grupo "${s.name}" sin asignar?`))return;s.assignments={},await r.API.updateCourseGroup(t,o.groups);let n=document.getElementById(`group-card-${t}-${e}`);n&&n.querySelectorAll("select").forEach(i=>{i.value=""}),g("\xC9xito","Todas las asignaturas del grupo han sido puestas sin asignar","success")}catch{g("Error","No se pudo limpiar las asignaciones del grupo","error")}}async function He(t){try{let e=r.courses.find(s=>s.id===t);if(!e||!confirm(`\xBFEst\xE1s seguro de que deseas poner todas las asignaturas de TODOS los grupos del curso "${e.name}" sin asignar?`))return;e.groups.forEach(s=>{s.assignments={}}),await r.API.updateCourseGroup(t,e.groups);let o=document.getElementById(`course-card-${t}`);o&&o.querySelectorAll("select").forEach(n=>{n.value=""}),g("\xC9xito","Todas las asignaturas del curso han sido puestas sin asignar","success")}catch{g("Error","No se pudo limpiar las asignaciones del curso","error")}}var le=null,W=[];function ke(t){let e=r.teachers.find(i=>i.id===t);if(!e)return;le=t,W=e.availability?[...e.availability]:[];let o=document.getElementById("availability-teacher-name");o&&(o.textContent=e.name);let s=document.getElementById("availability-grid-body");if(!s)return;s.innerHTML="";let n=[{start:"09:00",end:"09:30"},{start:"09:30",end:"10:00"},{start:"10:00",end:"10:30"},{start:"10:30",end:"11:00"},{start:"11:00",end:"11:30"},{start:"11:30",end:"12:00"},{start:"12:30",end:"13:00"},{start:"13:00",end:"13:30"},{start:"13:30",end:"14:00"}];s.innerHTML=n.map((i,d)=>{let l="";for(let u=1;u<=5;u++){let m=W.some(v=>v.dayOfWeek===u&&v.startTime===i.start&&v.endTime===i.end),p=`cell-av-${u}-${d}`,c=m?"bg-red-500 hover:bg-red-600 text-white border-red-300 font-bold":"bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200",x=m?"NO DISPONIBLE":"DISPONIBLE";l+=`
                <td class="p-2 text-center border border-gray-200">
                    <button type="button" id="${p}" 
                        onclick="toggleAvailabilitySlot(${u}, '${i.start}', '${i.end}', '${p}')"
                        class="w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all ${c}">
                        ${x}
                    </button>
                </td>
            `}return`
            <tr class="hover:bg-gray-50">
                <td class="p-3 border border-gray-200 font-semibold text-gray-700 text-center">${i.start} - ${i.end}</td>
                ${l}
            </tr>
        `}).join("");let a=document.getElementById("availability-modal");a&&a.classList.replace("hidden","flex")}function Ae(t,e,o,s){let n=document.getElementById(s);if(!n)return;let a=W.findIndex(i=>i.dayOfWeek===t&&i.startTime===e&&i.endTime===o);a>-1?(W.splice(a,1),n.className="w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200",n.textContent="DISPONIBLE"):(W.push({dayOfWeek:t,startTime:e,endTime:o}),n.className="w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all bg-red-500 hover:bg-red-600 text-white border border-red-300 font-bold",n.textContent="NO DISPONIBLE")}function ce(){let t=document.getElementById("availability-modal");t&&t.classList.replace("flex","hidden")}async function Pe(){if(!le)return;let t=r.teachers.find(e=>e.id===le);if(t){t.availability=W;try{await r.API.saveTeacher(t),g("\xC9xito","Disponibilidad docente guardada correctamente","success"),ce(),O()}catch{g("Error","No se pudo guardar la disponibilidad","error")}}}function ue(){let t=r.config;if(!t)return;let e=document.getElementById("settings-tiempo-minimo"),o=document.getElementById("settings-tiempo-maximo"),s=document.getElementById("settings-max-minutos-profesor"),n=document.getElementById("settings-priorizar-tutor"),a=document.getElementById("settings-priorizar-tutor-puntos"),i=document.getElementById("settings-bloques-60-puntos"),d=document.getElementById("settings-minimizar-asignaturas"),l=document.getElementById("settings-minimizar-asignaturas-puntos"),u=document.getElementById("settings-limite-tiempo"),m=document.getElementById("settings-tiempo-estancamiento"),p=document.getElementById("settings-hora-inicio"),c=document.getElementById("settings-hora-fin"),x=document.getElementById("settings-recreo-inicio"),v=document.getElementById("settings-recreo-duracion"),f=document.getElementById("settings-respetar-especialidad"),b=document.getElementById("settings-respetar-limite-horas"),E=document.getElementById("settings-respetar-disponibilidad");if(e&&(e.value=t.tiempoMinimo.toString()),o&&(o.value=t.tiempoMaximo.toString()),s&&(s.value=t.minutosMaximosProfesor.toString()),n){n.checked=t.priorizarTutor;let I=document.getElementById("settings-tutor-points-container");I&&(I.style.display=t.priorizarTutor?"flex":"none"),n.onchange=()=>{I&&(I.style.display=n.checked?"flex":"none")}}if(a&&(a.value=t.priorizarTutorPuntos.toString()),i&&(i.value=t.fomentarBloques60Puntos.toString()),d){d.checked=t.minimizarAsignaturasDistintas??!0;let I=document.getElementById("settings-minimizar-asignaturas-points-container");I&&(I.style.display=d.checked?"flex":"none"),d.onchange=()=>{I&&(I.style.display=d.checked?"flex":"none")}}l&&(l.value=(t.minimizarAsignaturasPuntos??50).toString()),u&&(u.value=(t.limiteTiempoSegundos??18e3).toString()),m&&(m.value=(t.tiempoEstancamientoSegundos??60).toString()),p&&(p.value=t.horaInicioClases),c&&(c.value=t.horaFinClases),x&&(x.value=t.horaInicioRecreo),v&&(v.value=t.duracionRecreo.toString()),f&&(f.checked=t.respetarEspecialidad),b&&(b.checked=t.respetarLimiteHoras),E&&(E.checked=t.respetarDisponibilidad)}async function Be(){let t=document.getElementById("settings-tiempo-minimo"),e=document.getElementById("settings-tiempo-maximo"),o=document.getElementById("settings-max-minutos-profesor"),s=document.getElementById("settings-priorizar-tutor"),n=document.getElementById("settings-priorizar-tutor-puntos"),a=document.getElementById("settings-bloques-60-puntos"),i=document.getElementById("settings-minimizar-asignaturas"),d=document.getElementById("settings-minimizar-asignaturas-puntos"),l=document.getElementById("settings-limite-tiempo"),u=document.getElementById("settings-tiempo-estancamiento"),m=document.getElementById("settings-hora-inicio"),p=document.getElementById("settings-hora-fin"),c=document.getElementById("settings-recreo-inicio"),x=document.getElementById("settings-recreo-duracion"),v=document.getElementById("settings-respetar-especialidad"),f=document.getElementById("settings-respetar-limite-horas"),b=document.getElementById("settings-respetar-disponibilidad"),E={priorizarTutor:s?s.checked:!1,tiempoMinimo:t?parseInt(t.value):30,tiempoMaximo:e?parseInt(e.value):60,minutosMaximosProfesor:o?parseInt(o.value):1500,priorizarTutorPuntos:n?parseInt(n.value):100,fomentarBloques60Puntos:a?parseInt(a.value):10,minimizarAsignaturasDistintas:i?i.checked:!0,minimizarAsignaturasPuntos:d?parseInt(d.value):50,limiteTiempoSegundos:l?parseFloat(l.value):18e3,tiempoEstancamientoSegundos:u?parseFloat(u.value):60,horaInicioClases:m?m.value:"09:00",horaFinClases:p?p.value:"14:00",horaInicioRecreo:c?c.value:"12:00",duracionRecreo:x?parseInt(x.value):30,respetarEspecialidad:v?v.checked:!0,respetarLimiteHoras:f?f.checked:!0,respetarDisponibilidad:b?b.checked:!0};try{r.config=await r.API.saveConfig(E),g("\xC9xito","Configuraci\xF3n de reglas guardada correctamente","success")}catch{g("Error","No se pudo guardar la configuraci\xF3n","error")}}var ee={ok:'<svg class="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',warning:'<svg class="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',error:'<svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'},De={ok:{bg:"bg-emerald-50",border:"border-emerald-200",text:"text-emerald-800",badge:"bg-emerald-100 text-emerald-700"},warning:{bg:"bg-amber-50",border:"border-amber-200",text:"text-amber-800",badge:"bg-amber-100 text-amber-700"},error:{bg:"bg-red-50",border:"border-red-200",text:"text-red-800",badge:"bg-red-100 text-red-700"}};function Fe(t){let e=(t.status||"ok").toLowerCase(),o=De[e]||De.ok,s=ee[e]||ee.ok,n=t.details&&t.details.length>0?`<div class="mt-2.5 pt-2 border-t border-red-200/60 space-y-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider ${o.text} opacity-90">Detalles del conflicto (${t.details.length}):</div>
            <ul class="space-y-1 text-xs text-gray-700">
                ${t.details.map(a=>`<li class="flex items-start gap-1.5 leading-relaxed bg-white/70 p-2 rounded border border-red-100"><span class="text-red-500 font-bold">\u2022</span><span class="flex-1">${a}</span></li>`).join("")}
            </ul>
           </div>`:"";return`
        <div class="p-3.5 rounded-xl ${o.bg} border ${o.border} transition-all duration-200 shadow-sm">
            <div class="flex items-start gap-3">
                ${s}
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <div class="font-bold text-sm ${o.text}">${t.name}</div>
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${o.badge} uppercase tracking-wider">${e}</span>
                    </div>
                    <div class="text-xs text-gray-600 mt-1">${t.message}</div>
                    ${n}
                </div>
            </div>
        </div>
    `}async function Ne(){let t=document.getElementById("prevalidation-modal"),e=document.getElementById("prevalidation-body"),o=document.getElementById("prevalidation-summary");if(!(!t||!e||!o)){t.classList.remove("hidden"),t.classList.add("flex"),e.innerHTML=`
        <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <span class="ml-3 text-gray-500 text-sm">Analizando viabilidad...</span>
        </div>
    `,o.innerHTML="";try{let s=await r.API.getPrevalidation(),n=s.checks.filter(l=>(l.status||"").toLowerCase()==="error").length,a=s.checks.filter(l=>(l.status||"").toLowerCase()==="warning").length,i=s.checks.filter(l=>(l.status||"").toLowerCase()==="ok").length;s.viable&&n===0?o.innerHTML=`
                <div class="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    ${ee.ok}
                    <div>
                        <div class="text-emerald-800 font-bold text-sm">Plantilla Viable \u2014 Todos los chequeos superados</div>
                        <div class="text-xs text-emerald-600 mt-0.5">El sistema puede generar los horarios sin conflictos estructurales.</div>
                    </div>
                    <span class="ml-auto text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">${i} OK</span>
                </div>
            `:o.innerHTML=`
                <div class="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                    ${ee.error}
                    <div>
                        <div class="text-red-800 font-bold text-sm">Inviabilidad Detectada \u2014 ${n} chequeo(s) con errores</div>
                        <div class="text-xs text-red-600 mt-0.5">Corrige los puntos se\xF1alados abajo para asegurar la viabilidad.</div>
                    </div>
                    <span class="ml-auto text-xs font-semibold px-2.5 py-1 bg-red-100 text-red-800 rounded-full">${n} Error${n!==1?"es":""}</span>
                </div>
            `;let d=[...s.checks].sort((l,u)=>{let m={error:0,warning:1,ok:2},p=(l.status||"ok").toLowerCase(),c=(u.status||"ok").toLowerCase();return(m[p]??2)-(m[c]??2)});e.innerHTML=d.map(Fe).join("")}catch(s){e.innerHTML=`
            <div class="text-center py-8 text-red-500">
                <p class="font-bold">Error al ejecutar el diagn\xF3stico</p>
                <p class="text-sm text-gray-500 mt-1">${s}</p>
            </div>
        `}}}function Re(){let t=document.getElementById("prevalidation-modal");t&&(t.classList.add("hidden"),t.classList.remove("flex"))}function _e(){if(!r.courses||r.courses.length===0){g("Info","No hay cursos ni grupos registrados para imprimir.","info");return}let t=document.getElementById("print-area");t||(t=document.createElement("div"),t.id="print-area",document.body.appendChild(t));let e=9,o=14,s=30;if(r.config){let c=r.config.horaInicioClases.split(":"),x=r.config.horaFinClases.split(":");e=parseInt(c[0]),o=parseInt(x[0]),s=r.config.tiempoMinimo||30}let n=[],a=e*60,i=o*60;for(;a<i;){let c=a+s,x=Math.floor(a/60).toString().padStart(2,"0"),v=(a%60).toString().padStart(2,"0"),f=Math.floor(c/60).toString().padStart(2,"0"),b=(c%60).toString().padStart(2,"0");n.push({startStr:`${x}:${v}`,endStr:`${f}:${b}`,startMin:a,endMin:c}),a=c}let d=[{id:1,name:"Lunes"},{id:2,name:"Martes"},{id:3,name:"Mi\xE9rcoles"},{id:4,name:"Jueves"},{id:5,name:"Viernes"}],l=new Map(r.subjects.map(c=>[c.id,c])),u=new Map(r.teachers.map(c=>[c.id,c])),m=new Map;r.courses.forEach(c=>{c.groups.forEach(x=>{m.set(x.id,{course:c,group:x})})});let p="";r.courses.forEach(c=>{c.groups.forEach(x=>{let v=r.scheduledClasses.filter(b=>b.groupId===x.id);p+=`
                <div class="print-page">
                    <div class="flex justify-between items-center mb-2 border-b-2 border-indigo-600 pb-1">
                        <div>
                            <h1 class="text-xl font-bold text-gray-900 leading-tight">${c.name} - Grupo ${x.name}</h1>
                            <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Horario Lectivo Oficial \u2022 EduSchedule</p>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">Clases: ${v.length}</span>
                        </div>
                    </div>

                    <table class="w-full border-collapse border border-gray-300 text-xs table-fixed">
                        <thead>
                            <tr class="bg-slate-800 text-white font-bold border-b border-gray-300">
                                <th class="p-1 border border-gray-300 w-20 text-center text-[10px]">Hora</th>
                                ${d.map(b=>`<th class="p-1 border border-gray-300 text-center text-[11px]">${b.name}</th>`).join("")}
                            </tr>
                        </thead>
                        <tbody>
            `;let f=new Map;d.forEach(b=>f.set(b.id,new Set)),n.forEach((b,E)=>{let I=!1;if(r.config){let h=r.config.horaInicioRecreo.split(":"),y=parseInt(h[0])*60+parseInt(h[1]),w=y+r.config.duracionRecreo;b.startMin>=y&&b.startMin<w&&(I=!0)}if(I){p+=`
                        <tr class="bg-gray-100 text-gray-500 font-semibold">
                            <td class="p-1 border border-gray-300 text-center font-mono text-[9px]">${b.startStr} - ${b.endStr}</td>
                            <td colspan="5" class="p-1 border border-gray-300 text-center bg-gray-100 text-slate-500 text-[10px]">\u2615 Recreo</td>
                        </tr>
                    `;return}p+="<tr>",p+=`<td class="p-1 border border-gray-300 text-center font-mono text-[9px] font-medium bg-gray-50">${b.startStr} - ${b.endStr}</td>`,d.forEach(h=>{if(f.get(h.id).has(E))return;let y=v.find(w=>{let C=new Date(w.start);return C.getDay()!==h.id?!1:C.getHours()*60+C.getMinutes()===b.startMin});if(y){let w=l.get(y.subjectId),C=u.get(y.teacherId),M=V(y.subjectId),L=y.isPinned?"\u{1F4CC} ":"",B=!1,D=E+1<n.length?n[E+1]:null;if(D){let A=!1;if(r.config){let $=r.config.horaInicioRecreo.split(":"),P=parseInt($[0])*60+parseInt($[1]),j=P+r.config.duracionRecreo;D.startMin>=P&&D.startMin<j&&(A=!0)}if(!A){let $=v.find(P=>{let j=new Date(P.start);return j.getDay()!==h.id?!1:j.getHours()*60+j.getMinutes()===D.startMin});$&&$.subjectId===y.subjectId&&$.teacherId===y.teacherId&&$.groupId===y.groupId&&(B=!0,f.get(h.id).add(E+1))}}let S=B?'rowspan="2"':"",k=B?" (1h)":"";p+=`
                            <td ${S} class="p-1 border border-gray-300 align-middle text-white font-medium shadow-inner" style="background-color: ${M} !important; color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
                                <div class="font-bold text-[10px] truncate leading-tight">${L}${w?w.name:"Clase"}${k}</div>
                                ${C?`<div class="text-[9px] opacity-95 truncate leading-tight font-normal">Prof: ${C.name}</div>`:""}
                            </td>
                        `}else p+='<td class="p-1 border border-gray-300 text-center text-gray-300 bg-white text-[9px]">--</td>'}),p+="</tr>"}),p+=`
                        </tbody>
                    </table>
                </div>
            `})}),r.teachers.forEach(c=>{let x=r.scheduledClasses.filter(b=>b.teacherId===c.id),v=x.reduce((b,E)=>b+E.duration,0);p+=`
            <div class="print-page">
                <div class="flex justify-between items-center mb-2 border-b-2 border-indigo-600 pb-1">
                    <div>
                        <h1 class="text-xl font-bold text-gray-900 leading-tight">Horario Personal Docente: ${c.name}</h1>
                        <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Horario Individual \u2022 EduSchedule</p>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">Jornada: ${v.toFixed(1)}h</span>
                    </div>
                </div>

                <table class="w-full border-collapse border border-gray-300 text-xs table-fixed">
                    <thead>
                        <tr class="bg-slate-800 text-white font-bold border-b border-gray-300">
                            <th class="p-1 border border-gray-300 w-20 text-center text-[10px]">Hora</th>
                            ${d.map(b=>`<th class="p-1 border border-gray-300 text-center text-[11px]">${b.name}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
        `;let f=new Map;d.forEach(b=>f.set(b.id,new Set)),n.forEach((b,E)=>{let I=!1;if(r.config){let h=r.config.horaInicioRecreo.split(":"),y=parseInt(h[0])*60+parseInt(h[1]),w=y+r.config.duracionRecreo;b.startMin>=y&&b.startMin<w&&(I=!0)}if(I){p+=`
                    <tr class="bg-gray-100 text-gray-500 font-semibold">
                        <td class="p-1 border border-gray-300 text-center font-mono text-[9px]">${b.startStr} - ${b.endStr}</td>
                        <td colspan="5" class="p-1 border border-gray-300 text-center bg-gray-100 text-slate-500 text-[10px]">\u2615 Recreo</td>
                    </tr>
                `;return}p+="<tr>",p+=`<td class="p-1 border border-gray-300 text-center font-mono text-[9px] font-medium bg-gray-50">${b.startStr} - ${b.endStr}</td>`,d.forEach(h=>{if(f.get(h.id).has(E))return;let y=x.find(w=>{let C=new Date(w.start);return C.getDay()!==h.id?!1:C.getHours()*60+C.getMinutes()===b.startMin});if(y){let w=l.get(y.subjectId),C=m.get(y.groupId),M=C?C.course:null,L=C?C.group:null,B=M&&L?`${M.name} G.${L.name}`:"",D=V(y.subjectId),S=y.isPinned?"\u{1F4CC} ":"",k=!1,A=E+1<n.length?n[E+1]:null;if(A){let j=!1;if(r.config){let N=r.config.horaInicioRecreo.split(":"),J=parseInt(N[0])*60+parseInt(N[1]),U=J+r.config.duracionRecreo;A.startMin>=J&&A.startMin<U&&(j=!0)}if(!j){let N=x.find(J=>{let U=new Date(J.start);return U.getDay()!==h.id?!1:U.getHours()*60+U.getMinutes()===A.startMin});N&&N.subjectId===y.subjectId&&N.teacherId===y.teacherId&&N.groupId===y.groupId&&(k=!0,f.get(h.id).add(E+1))}}let $=k?'rowspan="2"':"",P=k?" (1h)":"";p+=`
                        <td ${$} class="p-1 border border-gray-300 align-middle text-white font-medium shadow-inner" style="background-color: ${D} !important; color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
                            <div class="font-bold text-[10px] truncate leading-tight">${S}${w?w.name:"Clase"}${P}</div>
                            ${B?`<div class="text-[9px] opacity-95 truncate leading-tight font-normal">${B}</div>`:""}
                        </td>
                    `}else p+='<td class="p-1 border border-gray-300 text-center text-gray-300 bg-white text-[9px]">--</td>'}),p+="</tr>"}),p+=`
                    </tbody>
                </table>
            </div>
        `}),t.innerHTML=p,g("Imprimiendo","Preparando documento A4 Horizontal con horarios de grupos y profesores...","info"),setTimeout(()=>{window.print()},300)}var te="0.0.6",Ve="guillemo12/Horarios-profesores";function Ge(t){return t.replace(/^v/,"").trim().split(".").map(o=>parseInt(o,10)||0)}function Je(t,e=te){let o=Ge(t),s=Ge(e),n=Math.max(o.length,s.length);for(let a=0;a<n;a++){let i=o[a]??0,d=s[a]??0;if(i>d)return!0;if(i<d)return!1}return!1}function Ke(t){if(!t||t.length===0)return null;let e=navigator.userAgent.includes("Windows")||navigator.platform.includes("Win"),o=navigator.userAgent.includes("Linux");if(e){let s=t.find(d=>d.name.endsWith("-setup.exe"));if(s)return s;let n=t.find(d=>d.name.includes("Unico")&&d.name.endsWith(".exe"));if(n)return n;let a=t.find(d=>d.name.endsWith(".exe"));if(a)return a;let i=t.find(d=>d.name.endsWith(".msi"));if(i)return i}if(o){let s=t.find(a=>a.name.endsWith(".AppImage"));if(s)return s;let n=t.find(a=>a.name.endsWith(".deb"));if(n)return n}return t[0]||null}function Qe(){if(typeof window<"u"&&("__TAURI__"in window||"__TAURI_INTERNALS__"in window||"__TAURI_METADATA__"in window))return!1;let e=window.location.hostname;return e==="localhost"||e==="127.0.0.1"||e===""||e.startsWith("192.168.")}async function me(t=!1){if(Qe()){t||g("Modo Desarrollo","Los avisos de actualizaci\xF3n est\xE1n desactivados en entorno de desarrollo.","info");return}try{let e=await fetch(`https://api.github.com/repos/${Ve}/releases/latest`,{headers:{Accept:"application/vnd.github.v3+json"}});if(!e.ok){t||g("Actualizaciones","No se encontr\xF3 ning\xFAn release publicado en GitHub.","warning");return}let o=await e.json();Je(o.tag_name,te)?Ye(o):t||g("Actualizado",`EduSchedule est\xE1 al d\xEDa (v${te}).`,"success")}catch(e){console.error("Error al buscar actualizaciones:",e),t||g("Error","Error de red al consultar actualizaciones.","error")}}function Ye(t){let e=document.getElementById("modal-update-dialog");e||(e=document.createElement("div"),e.id="modal-update-dialog",e.className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4",document.body.appendChild(e));let o=Ke(t.assets);e.innerHTML=`
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden transition-all transform scale-100">
            <div class="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                        \u{1F680}
                    </div>
                    <div>
                        <h3 class="font-bold text-lg leading-tight">\xA1Nueva versi\xF3n disponible!</h3>
                        <p class="text-xs text-indigo-100 font-medium">v${te} \u2794 <span class="font-bold text-white">${t.tag_name}</span></p>
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
    `;let s=document.getElementById("btn-trigger-update");s&&o?s.addEventListener("click",async()=>{await Xe(o,t)}):s&&s.addEventListener("click",()=>{window.open(t.html_url,"_blank")})}async function Xe(t,e){let o=document.getElementById("update-action-container");if(o){o.innerHTML=`
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
    `;try{let s=await fetch("/api/v1/system/update/install",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({downloadUrl:t.browser_download_url,fileName:t.name})});if(s.ok){let n=document.getElementById("update-status-text");n&&(n.innerText="\xA1Descarga completa! Iniciando instalador..."),g("Actualizaci\xF3n","La aplicaci\xF3n se est\xE1 reiniciando con la nueva versi\xF3n.","success")}else throw new Error(`Servidor devolvi\xF3 status ${s.status}`)}catch(s){console.error("Error al ejecutar actualizaci\xF3n de un clic:",s),g("Error de actualizaci\xF3n","No se pudo actualizar autom\xE1ticamente. Abriendo descarga directa.","warning"),o.innerHTML=`
            <div class="space-y-2">
                <p class="text-xs text-rose-600 font-medium text-center">No se pudo completar autom\xE1ticamente. Puede descargar el instalador directamente:</p>
                <a href="${t.browser_download_url}" target="_blank" class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2">
                    \u2B07\uFE0F Descargar ${t.name}
                </a>
            </div>
        `}}}var r={API:new K,WS:new Q,subjects:[],teachers:[],courses:[],scheduledClasses:[],calendarInstance:null,currentEventContext:null,currentCourseId:null};function pe(t,e,o="",s=0,n=""){fetch("/api/v1/log",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({level:t,message:e,source:o,line:s,stack:n??""})}).catch(()=>{})}window.onerror=(t,e,o,s,n)=>(pe("error",String(t),e??"",o??0,n?.stack??""),!1);window.addEventListener("unhandledrejection",t=>{let e=t.reason,o=e instanceof Error?e.message:String(e);pe("error",`Unhandled Promise Rejection: ${o}`,"",0,e?.stack??"")});var Ze=console.error.bind(console);console.error=(...t)=>{Ze(...t);let e=t.map(s=>s instanceof Error?s.message:String(s)).join(" "),o=t.find(s=>s instanceof Error)?.stack??"";pe("error",e,"console.error",0,o)};async function et(t=15,e=1e3){let o=document.getElementById("loader-text");for(let s=1;s<=t;s++){try{if(o&&s>1&&(o.textContent=`Iniciando motor y servidor local... (${s}/${t})`),(await fetch("/api/v1/config",{cache:"no-store"})).ok)return!0}catch{}await new Promise(n=>setTimeout(n,e))}return!1}async function ge(){let[t,e,o,s,n]=await Promise.all([r.API.getSubjects(),r.API.getTeachers(),r.API.getCourses(),r.API.getSchedule(),r.API.getConfig()]);r.subjects=t,r.teachers=e,r.courses=o,r.scheduledClasses=s,r.config=n}window.onload=async function(){try{if(!await et())throw new Error("No se pudo conectar con el servidor Ktor tras varios intentos.");await ge();let e=document.getElementById("app-loader");e&&(e.style.opacity="0",setTimeout(()=>e.remove(),300)),be(),oe(),Y(),r.WS.connect(),tt(),setTimeout(()=>{me(!0)},2e3)}catch(t){console.error("Init Error:",t);let e=document.getElementById("loader-text");e&&(e.textContent="Error conectando con la API local. Aseg\xFArese de que el servidor Ktor est\xE9 encendido.",e.className="mt-4 text-red-600 font-bold px-4 text-center")}};function tt(){let t=document.getElementById("btn-toggle-engine"),e=document.getElementById("ws-status");r.WS.on("connected",()=>{t&&(t.disabled=!1,t.classList.replace("bg-gray-400","bg-emerald-600"),t.classList.add("hover:bg-emerald-700"),t.classList.remove("cursor-not-allowed"));let o=document.getElementById("text-engine-btn");o&&(o.textContent="Generar (WS)"),e&&(e.innerHTML='<span class="relative flex h-2.5 w-2.5 mr-1.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span> Conectado')}),r.WS.on("disconnected",()=>{t&&(t.disabled=!0,t.classList.replace("bg-emerald-600","bg-gray-400"),t.classList.remove("hover:bg-emerald-700"),t.classList.add("cursor-not-allowed"));let o=document.getElementById("text-engine-btn");o&&(o.textContent="Conectando..."),e&&(e.innerHTML='<span class="relative flex h-2.5 w-2.5 mr-1.5"><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span> Desconectado')}),r.WS.on("scores_updated",o=>{let s=document.getElementById("score-hard"),n=document.getElementById("score-soft"),a=document.getElementById("score-soft-tooltip-text");if(s&&(s.textContent=o.hard.toString()),n){let m=o.porcentaje!==void 0&&!isNaN(o.porcentaje)?Math.min(100,Math.max(0,o.porcentaje)).toFixed(1)+"%":"0.0%";n.textContent=m}if(a){let m=o.rawObjective||o.soft||0,p=o.bound||0;a.innerHTML=`Puntos: <b class="text-white">${m.toLocaleString()}</b> / <b class="text-indigo-400">${p.toLocaleString()}</b> pts`}let i=document.getElementById("status-conflict"),d=document.getElementById("status-ok");i&&d&&(o.hard===0?(i.classList.replace("flex","hidden"),d.classList.replace("hidden","flex")):(d.classList.replace("flex","hidden"),i.classList.replace("hidden","flex")));let l=document.getElementById("conflict-tooltip-count"),u=document.getElementById("conflict-tooltip-list");if(l&&u){let m=o.conflictos||[];l.textContent=m.length.toString(),m.length===0?u.innerHTML='<span class="text-emerald-600 font-medium">\xA1Horario matem\xE1ticamente correcto!</span>':u.innerHTML='<ul class="list-disc pl-4 space-y-1 text-red-600 font-medium">'+m.map(p=>`<li>${p}</li>`).join("")+"</ul>"}}),r.WS.on("optimization_complete",()=>{Oe(!0),g("\xA1Matem\xE1ticamente Correcto!","El servidor WS ha encontrado la disposici\xF3n perfecta.","success")}),r.WS.on("schedule_pushed",o=>{r.scheduledClasses=o,T()})}function Oe(t=!1){try{let e=document.getElementById("btn-toggle-engine");if(!e)return;let o=document.getElementById("icon-stop"),s=document.getElementById("icon-play"),n=document.getElementById("text-engine-btn");r.WS.isOptimizing||t?(r.WS.sendCommand("STOP"),e.classList.replace("bg-red-600","bg-emerald-600"),e.classList.replace("hover:bg-red-700","hover:bg-emerald-700"),e.classList.remove("animate-pulse"),o&&o.classList.add("hidden"),s&&s.classList.remove("hidden"),n&&(n.textContent="Generar (WS)")):(r.WS.sendCommand("START"),e.classList.replace("bg-emerald-600","bg-red-600"),e.classList.replace("hover:bg-red-700","hover:bg-red-700"),e.classList.add("animate-pulse"),s&&s.classList.add("hidden"),o&&o.classList.remove("hidden"),n&&(n.textContent="Parar Motor"))}catch(e){console.error("Error in toggleOptimizationEngine:",e),g("Error","No se pudo iniciar el motor de optimizaci\xF3n","error")}}function ot(t){document.querySelectorAll(".view-tab").forEach(n=>n.classList.remove("active"));let e=document.getElementById(`view-${t}`);e&&e.classList.add("active"),document.querySelectorAll(".nav-btn").forEach(n=>{n.classList.remove("bg-indigo-600","text-white","shadow-inner"),n.classList.add("text-slate-300")});let o=document.getElementById(`nav-${t}`);o&&(o.classList.remove("text-slate-300"),o.classList.add("bg-indigo-600","text-white","shadow-inner"));let s=document.getElementById("header-calendar");s&&(s.style.display=t==="calendar"?"flex":"none"),t==="subjects"&&Z(),t==="teachers"&&O(),t==="courses"&&z(),t==="assignments"&&$e(),t==="settings"&&ue(),t==="calendar"&&setTimeout(()=>{r.calendarInstance&&r.calendarInstance.render(),oe(),Y()},50)}function oe(){let t=document.getElementById("view-type-select"),e=document.getElementById("header-course-select"),o=document.getElementById("header-course-separator"),s=document.getElementById("view-entity-select");if(!t||!e||!s||!o)return;let n=t.value,a=e.value,i=s.value;n==="group"?(e.classList.remove("hidden"),o.classList.remove("hidden"),e.innerHTML=r.courses.map(d=>`<option value="${d.id}">${d.name}</option>`).join(""),a&&Array.from(e.options).some(d=>d.value===a)&&(e.value=a),re(i)):(e.classList.add("hidden"),o.classList.add("hidden"),s.innerHTML=r.teachers.map(d=>`<option value="${d.id}">${d.name}</option>`).join(""),i&&Array.from(s.options).some(d=>d.value===i)&&(s.value=i),T())}function rt(){re(null)}async function st(){try{g("Copia de Seguridad","Preparando archivo de base de datos...","info");let t=await fetch("/api/v1/system/database/export");if(!t.ok)throw new Error(`Error en el servidor: ${t.statusText}`);let e=await t.blob(),o=t.headers.get("Content-Disposition"),s=`EduSchedule_Backup_${new Date().toISOString().split("T")[0]}.db`;if(o&&o.includes("filename=")){let i=o.match(/filename="?([^"]+)"?/);i&&i[1]&&(s=i[1])}let n=window.URL.createObjectURL(e),a=document.createElement("a");a.href=n,a.download=s,document.body.appendChild(a),a.click(),window.URL.revokeObjectURL(n),a.remove(),g("Copia de Seguridad",`Base de datos exportada: ${s}`,"success")}catch(t){console.error("Error al exportar base de datos:",t),g("Error",`No se pudo exportar la base de datos: ${t.message}`,"error")}}async function nt(t){if(!t.files||t.files.length===0)return;let e=t.files[0];if(t.value="",!e.name.endsWith(".db")&&!e.name.endsWith(".sqlite")){g("Archivo no v\xE1lido","Por favor selecciona un archivo .db o .sqlite v\xE1lido.","warning");return}if(confirm(`\xBFEst\xE1s seguro de que deseas restaurar la copia de seguridad "${e.name}"?

Esta acci\xF3n reemplazar\xE1 la base de datos actual y actualizar\xE1 toda la informaci\xF3n.`))try{g("Restaurando","Validando e importando base de datos...","info");let s=new FormData;s.append("file",e);let n=await fetch("/api/v1/system/database/import",{method:"POST",body:s}),a=await n.json();if(n.ok&&a.success)g("Restauraci\xF3n Completada","La base de datos se ha restaurado con \xE9xito. Actualizando vista...","success"),await ge(),ue(),T(),oe();else throw new Error(a.message||"Error desconocido al importar.")}catch(s){console.error("Error al restaurar base de datos:",s),g("Error de Restauraci\xF3n",`No se pudo restaurar la base de datos: ${s.message}`,"error")}}Object.assign(window,{AppData:r,loadAllData:ge,switchTab:ot,updateEntitySelector:oe,onHeaderCourseChange:rt,toggleOptimizationEngine:Oe,openFormModal:Ee,closeCrudModal:G,openGroupModal:Ie,deleteSubject:Ce,deleteTeacher:Se,deleteCourse:Me,deleteGroup:Te,updateAssignment:Le,saveNewClass:he,closeAddClassModal:X,openAddClassModal:se,onModalCourseChange:q,openEventDetail:ne,closeEventDetail:F,refreshCalendarView:T,updateDateRange:Y,showToast:g,openCourseSubjects:we,openAvailabilityModal:ke,closeAvailabilityModal:ce,saveAvailability:Pe,saveSettings:Be,clearGroupSchedule:ve,clearGroupAssignments:je,clearCourseAssignments:He,toggleAvailabilitySlot:Ae,runPrevalidation:Ne,closePrevalidation:Re,toggleColorMode:xe,printAllSchedules:_e,checkForUpdates:me,exportDatabase:st,handleImportDatabaseFile:nt});})();
//# sourceMappingURL=Datos.js.map
