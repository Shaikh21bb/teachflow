import { test, expect } from '@playwright/test';

async function signIn(page, request, student = false) {
    const response = await request.post(student ? '/api/student/login' : '/api/auth/login', {
        data: student ? { username: 'student1', password: 'Testing12345' } : { email: 'teacher@test.example', password: 'Testing12345' },
    });
    expect(response.ok()).toBeTruthy();
    const credentials = await response.json();
    await page.addInitScript(({ credentials, student }) => {
        if (student) localStorage.setItem('studentToken', credentials.token);
        else {
            localStorage.setItem('auth_token', credentials.token);
            localStorage.setItem('auth_refresh_token', credentials.refreshToken);
        }
        localStorage.setItem('urpaq_theme', 'light');
        localStorage.setItem('urpaq_language', 'ru');
        localStorage.setItem('urpaq_welcome_seen', 'true');
        localStorage.setItem('tf_welcomed_1', '1');
        localStorage.setItem('tf_checklist_dismissed_1', '1');
    }, { credentials, student });
    return credentials;
}

test('teacher pages render without runtime errors or horizontal overflow', async ({ page, request }, testInfo) => {
    await signIn(page, request);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/dashboard', '/my-lessons', '/builder?edit=1', '/assignments', '/classes', '/quizzes', '/open-lessons', '/reports', '/schedule', '/marketplace', '/profile', '/pricing', '/chat', '/leaderboard', '/templates', '/library', '/admin']) {
        await page.goto(route);
        await expect(page.locator('.page-content')).toBeVisible();
        await page.waitForLoadState('networkidle');
        expect(await page.locator('.page-content').innerText(), route).not.toContain('Не удалось открыть страницу');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, route).toBeLessThanOrEqual(2);
        if (route === '/dashboard' || route === '/builder?edit=1') await page.screenshot({ path: `test-results/${testInfo.project.name}-${route.includes('builder') ? 'builder' : 'dashboard'}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
});

test('preview upload survives missing Cloudinary and editing retains the image', async ({ page, request }) => {
    await signIn(page, request);
    await page.goto('/builder?edit=1');
    await expect(page.locator('.lesson-builder')).toBeVisible();
    await page.getByRole('button', { name: 'Материалы', exact: false }).first().click();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jT1sAAAAASUVORK5CYII=', 'base64');
    await page.getByLabel('Превью урока').setInputFiles({ name: 'preview.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByText('Превью загружено!', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Сохранить черновик' }).first().click();
    await expect(page.getByText('Черновик сохранён', { exact: false })).toBeVisible();
    await page.reload();
    await expect(page.locator('.lesson-builder')).toBeVisible();
    const saved = await page.evaluate(async () => {
        const res = await fetch('/api/lessons/1', { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } });
        return res.json();
    });
    expect(saved.thumbnail_url).toMatch(/^data:image\/jpeg;base64,/);
    expect(saved.content).toBe('Existing content');
});

test('student submits homework and sees honest pending review', async ({ page, request }, testInfo) => {
    await signIn(page, request, true);
    await page.goto('/student/dashboard');
    await expect(page.getByText('Homework task', { exact: true })).toBeVisible();
    await page.goto('/student/assignment/1');
    await page.locator('textarea').fill('My solution is four, with a complete explanation.');
    await page.getByRole('button', { name: 'Үй жұмысын тексеру' }).click();
    await expect(page.getByText('Тексеруді күтуде', { exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/${testInfo.project.name}-student-homework.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
});

test('forbidden responses reject and expired concurrent requests refresh once', async ({ page, request }) => {
    await signIn(page, request);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.route('**/api/classes', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Credit or permission denied', code: 'FORBIDDEN' }) }));
    const message = await page.evaluate(async () => {
        const { classesAPI } = await import('/src/api.js');
        try { await classesAPI.getAll(); return 'unexpected-success'; }
        catch (error) { return error.message; }
    });
    expect(message).toContain('Credit or permission denied');
    await page.unroute('**/api/classes');
    let refreshes = 0;
    page.on('request', req => { if (req.url().endsWith('/api/auth/refresh')) refreshes++; });
    const lengths = await page.evaluate(async () => {
        const { classesAPI } = await import('/src/api.js');
        localStorage.setItem('auth_token', 'expired-token');
        return (await Promise.all([classesAPI.getAll(), classesAPI.getAll(), classesAPI.getAll()])).map(list => list.length);
    });
    expect(lengths).toEqual([1, 1, 1]);
    expect(refreshes).toBe(1);
});

test('teacher reviews a submitted assignment and saves a manual grade', async ({ page, request }) => {
    const teacher = await signIn(page, request);
    const authorization = { Authorization: `Bearer ${teacher.token}` };
    const assignment = await (await request.post('/api/assignments', { headers: authorization, data: { title: 'Manual review', class_id: 1, max_score: 10 } })).json();
    const student = await (await request.post('/api/student/login', { data: { username: 'student1', password: 'Testing12345' } })).json();
    await request.post(`/api/student-portal/assignments/${assignment.id}/submit`, { headers: { Authorization: `Bearer ${student.token}` }, data: { answer_text: 'My detailed explanation of the solution.' } });
    await page.goto('/assignments');
    const card = page.locator('.assignment-card').filter({ hasText: 'Manual review' }).last();
    await card.getByRole('button', { name: 'Проверить', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Балл', { exact: true }).fill('8');
    await page.getByRole('button', { name: 'Сохранить оценку' }).click();
    await expect(page.getByRole('dialog').getByText('8/10', { exact: false })).toBeVisible();
});

test('public pages and dark mode render on the target viewport', async ({ page, request }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/', '/login', '/register', '/student/login', '/not-a-page']) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        expect(await page.locator('body').innerText()).not.toContain('Не удалось открыть страницу');
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), route).toBeLessThanOrEqual(2);
    }
    await signIn(page, request);
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Toggle Theme' }).click();
    await expect(page.locator('html')).toHaveClass(/theme-dark/);
    await page.screenshot({ path: `test-results/${testInfo.project.name}-dashboard-dark.png`, fullPage: true });
    expect(errors).toEqual([]);
});
