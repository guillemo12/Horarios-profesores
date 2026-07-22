import { AppData } from './Datos';
import { showToast } from './utils';

export function loadSettings(): void {
    const conf = AppData.config;
    if (!conf) return;

    const elMinimo = document.getElementById('settings-tiempo-minimo') as HTMLInputElement;
    const elMaximo = document.getElementById('settings-tiempo-maximo') as HTMLInputElement;
    const elMaxProfe = document.getElementById('settings-max-minutos-profesor') as HTMLInputElement;
    const elPriorizar = document.getElementById('settings-priorizar-tutor') as HTMLInputElement;
    const elPriorizarPuntos = document.getElementById('settings-priorizar-tutor-puntos') as HTMLInputElement;
    const elBloquesPuntos = document.getElementById('settings-bloques-60-puntos') as HTMLInputElement;
    const elHuecosPuntos = document.getElementById('settings-huecos-puntos') as HTMLInputElement;
    const elCompactarPuntos = document.getElementById('settings-compactar-temprano-puntos') as HTMLInputElement;

    const elHoraInicio = document.getElementById('settings-hora-inicio') as HTMLInputElement;
    const elHoraFin = document.getElementById('settings-hora-fin') as HTMLInputElement;
    const elRecreoInicio = document.getElementById('settings-recreo-inicio') as HTMLInputElement;
    const elRecreoDuracion = document.getElementById('settings-recreo-duracion') as HTMLInputElement;

    const elRespEspecialidad = document.getElementById('settings-respetar-especialidad') as HTMLInputElement;
    const elRespLimiteHoras = document.getElementById('settings-respetar-limite-horas') as HTMLInputElement;
    const elRespDisponibilidad = document.getElementById('settings-respetar-disponibilidad') as HTMLInputElement;

    if (elMinimo) elMinimo.value = conf.tiempoMinimo.toString();
    if (elMaximo) elMaximo.value = conf.tiempoMaximo.toString();
    if (elMaxProfe) elMaxProfe.value = conf.minutosMaximosProfesor.toString();
    
    if (elPriorizar) {
        elPriorizar.checked = conf.priorizarTutor;
        const container = document.getElementById('settings-tutor-points-container');
        if (container) {
            container.style.display = conf.priorizarTutor ? 'flex' : 'none';
        }
        elPriorizar.onchange = () => {
            if (container) container.style.display = elPriorizar.checked ? 'flex' : 'none';
        };
    }
    
    if (elPriorizarPuntos) elPriorizarPuntos.value = conf.priorizarTutorPuntos.toString();
    if (elBloquesPuntos) elBloquesPuntos.value = conf.fomentarBloques60Puntos.toString();
    if (elHuecosPuntos) elHuecosPuntos.value = conf.evitarHuecosPuntos.toString();
    if (elCompactarPuntos) elCompactarPuntos.value = conf.compactarTempranoPuntos.toString();

    if (elHoraInicio) elHoraInicio.value = conf.horaInicioClases;
    if (elHoraFin) elHoraFin.value = conf.horaFinClases;
    if (elRecreoInicio) elRecreoInicio.value = conf.horaInicioRecreo;
    if (elRecreoDuracion) elRecreoDuracion.value = conf.duracionRecreo.toString();

    if (elRespEspecialidad) elRespEspecialidad.checked = conf.respetarEspecialidad;
    if (elRespLimiteHoras) elRespLimiteHoras.checked = conf.respetarLimiteHoras;
    if (elRespDisponibilidad) elRespDisponibilidad.checked = conf.respetarDisponibilidad;
}

export async function saveSettings(): Promise<void> {
    const elMinimo = document.getElementById('settings-tiempo-minimo') as HTMLInputElement;
    const elMaximo = document.getElementById('settings-tiempo-maximo') as HTMLInputElement;
    const elMaxProfe = document.getElementById('settings-max-minutos-profesor') as HTMLInputElement;
    const elPriorizar = document.getElementById('settings-priorizar-tutor') as HTMLInputElement;
    const elPriorizarPuntos = document.getElementById('settings-priorizar-tutor-puntos') as HTMLInputElement;
    const elBloquesPuntos = document.getElementById('settings-bloques-60-puntos') as HTMLInputElement;
    const elHuecosPuntos = document.getElementById('settings-huecos-puntos') as HTMLInputElement;
    const elCompactarPuntos = document.getElementById('settings-compactar-temprano-puntos') as HTMLInputElement;

    const elHoraInicio = document.getElementById('settings-hora-inicio') as HTMLInputElement;
    const elHoraFin = document.getElementById('settings-hora-fin') as HTMLInputElement;
    const elRecreoInicio = document.getElementById('settings-recreo-inicio') as HTMLInputElement;
    const elRecreoDuracion = document.getElementById('settings-recreo-duracion') as HTMLInputElement;

    const elRespEspecialidad = document.getElementById('settings-respetar-especialidad') as HTMLInputElement;
    const elRespLimiteHoras = document.getElementById('settings-respetar-limite-horas') as HTMLInputElement;
    const elRespDisponibilidad = document.getElementById('settings-respetar-disponibilidad') as HTMLInputElement;

    const payload = {
        priorizarTutor: elPriorizar ? elPriorizar.checked : false,
        tiempoMinimo: elMinimo ? parseInt(elMinimo.value) : 30,
        tiempoMaximo: elMaximo ? parseInt(elMaximo.value) : 60,
        minutosMaximosProfesor: elMaxProfe ? parseInt(elMaxProfe.value) : 1500,
        priorizarTutorPuntos: elPriorizarPuntos ? parseInt(elPriorizarPuntos.value) : 100,
        fomentarBloques60Puntos: elBloquesPuntos ? parseInt(elBloquesPuntos.value) : 10,
        evitarHuecosPuntos: elHuecosPuntos ? parseInt(elHuecosPuntos.value) : 50,
        compactarTempranoPuntos: elCompactarPuntos ? parseInt(elCompactarPuntos.value) : 5,

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
        showToast("Éxito", "Configuración de reglas guardada correctamente", "success");
    } catch (err) {
        showToast("Error", "No se pudo guardar la configuración", "error");
    }
}
