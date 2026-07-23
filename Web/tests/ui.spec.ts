import { test, expect } from '@playwright/test';

test.describe('EduSchedule UI Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Asume que hay un servidor Ktor levantado en el puerto 8080 en CI
        await page.goto('http://localhost:8080/');
    });

    test('Loads calendar and navigation tabs work', async ({ page }) => {
        // Verifica que la vista del calendario carga por defecto
        await expect(page.locator('#nav-calendar')).toBeVisible();
        await expect(page.locator('#calendar')).toBeVisible();

        // Verifica navegación a Asignaciones
        await page.click('#nav-assignments');
        await expect(page.locator('#view-assignments')).toBeVisible();
        await expect(page.locator('#view-calendar')).toBeHidden();

        // Verifica navegación a Profesores
        await page.click('#nav-teachers');
        await expect(page.locator('#view-teachers')).toBeVisible();

        // Verifica navegación a Cursos
        await page.click('#nav-courses');
        await expect(page.locator('#view-courses')).toBeVisible();
    });

    test('Can interact with configuration rules', async ({ page }) => {
        // Ve a ajustes
        await page.click('#nav-settings');
        await expect(page.locator('h2:has-text("Configuración del Motor")')).toBeVisible();

        // Cambiar valores
        await page.fill('#settings-tiempo-minimo', '50');
        await page.fill('#settings-max-minutos-profesor', '1450');

        // Toggle checkbox
        const checkbox = page.locator('#settings-priorizar-tutor');
        const isChecked = await checkbox.isChecked();
        if (isChecked) {
            await checkbox.uncheck();
        } else {
            await checkbox.check();
        }

        // Guardar
        await page.click('button:has-text("Guardar Configuración")');

        // Comprobar toast de éxito
        const toast = page.locator('h4:has-text("Éxito")');
        await expect(toast).toBeVisible();
    });
});
