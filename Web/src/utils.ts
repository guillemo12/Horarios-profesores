export function showToast(title: string, message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info'): void {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    
    let bgClass = type === 'error' ? 'border-red-500 text-red-500' 
                : (type === 'success' ? 'border-green-500 text-green-500' 
                : (type === 'warning' ? 'border-yellow-500 text-yellow-500' 
                : 'border-blue-500 text-blue-500'));
    
    toast.className = `bg-white border-l-4 ${bgClass} shadow-lg rounded-r-lg p-4 w-80 transform transition-all duration-300 translate-y-4 opacity-0 flex gap-3`;
    toast.innerHTML = `<div><h4 class="text-sm font-bold text-gray-800">${title}</h4><p class="text-xs text-gray-600 mt-1">${message}</p></div>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-4', 'opacity-0'), 10);
    setTimeout(() => { 
        toast.classList.add('opacity-0', 'translate-x-full'); 
        setTimeout(() => toast.remove(), 300); 
    }, 4000);
}

export function formatHours(h: number): string {
    return Number(h.toFixed(2)).toString();
}
