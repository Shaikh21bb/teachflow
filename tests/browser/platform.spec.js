import { test, expect } from '@playwright/test';

async function signIn(page, request, student = false, language = 'ru') {
    const response = await request.post(student ? '/api/student/login' : '/api/auth/login', {
        data: student ? { username: 'student1', password: 'Testing12345' } : { email: 'teacher@test.example', password: 'Testing12345' },
    });
    expect(response.ok()).toBeTruthy();
    const credentials = await response.json();
    await page.addInitScript(({ credentials, student, language }) => {
        if (student) localStorage.setItem('studentToken', credentials.token);
        else {
            localStorage.setItem('auth_token', credentials.token);
            localStorage.setItem('auth_refresh_token', credentials.refreshToken);
        }
        localStorage.setItem('urpaq_theme', 'light');
        localStorage.setItem('urpaq_language', language);
        localStorage.setItem('urpaq_welcome_seen', 'true');
        localStorage.setItem('tf_welcomed_1', '1');
        localStorage.setItem('tf_checklist_dismissed_1', '1');
    }, { credentials, student, language });
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
        if (route === '/builder?edit=1' && testInfo.project.name === 'mobile') {
            const heading = await page.locator('.builder-header h1').boundingBox();
            const back = await page.locator('.builder-header > button').first().boundingBox();
            expect(heading.y).toBeGreaterThan(back.y + back.height);
            expect(heading.width).toBeGreaterThan(300);
        }
        if (route === '/dashboard' || route === '/builder?edit=1') await page.screenshot({ path: `test-results/${testInfo.project.name}-${route.includes('builder') ? 'builder' : 'dashboard'}.png`, fullPage: true, animations: 'disabled' });
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

test('teacher deletes a lesson through the accessible Kazakh action dialog', async ({ page, request }, testInfo) => {
    if (testInfo.project.name === 'mobile') {
        await page.setViewportSize({ width: 320, height: 740 });
    }
    const credentials = await signIn(page, request, false, 'kk');
    const title = `Delete UI ${testInfo.project.name} ${Date.now()}`;
    const authorization = { Authorization: `Bearer ${credentials.token}` };
    const created = await request.post('/api/lessons', {
        headers: authorization,
        data: { title, subject: 'Biology', grade: 7 },
    });
    const lesson = await created.json();
    expect(created.status(), JSON.stringify(lesson)).toBe(201);

    try {
        await page.goto('/my-lessons');
        await expect(page.getByRole('heading', { name: 'Менің сабақтарым', exact: true })).toBeVisible();
        const card = page.getByRole('article', { name: title, exact: true });
        await expect(card).toBeVisible();

        const menuName = `Әрекеттер: ${title}`;
        const menuTrigger = card.getByRole('button', { name: menuName, exact: true });
        await expect(menuTrigger).toBeVisible();
        await menuTrigger.click();
        const menu = page.getByRole('menu', { name: menuName, exact: true });
        await expect(menu).toBeVisible();
        await expect(menu.getByRole('menuitem')).toHaveCount(7);
        await expect(menu.getByRole('menuitem').first()).toBeFocused();
        await page.keyboard.press('End');
        const deleteAction = menu.getByRole('menuitem', { name: 'Жою', exact: true });
        await expect(deleteAction).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(menu).toBeHidden();
        await expect(menuTrigger).toBeFocused();
        await menuTrigger.click();
        await expect(menu).toBeVisible();
        await page.evaluate(() => window.dispatchEvent(new Event('resize')));
        await expect(menu).toBeHidden();
        await expect(menuTrigger).toBeFocused();
        await menuTrigger.click();
        await menu.getByRole('menuitem', { name: 'Бөлісу', exact: true }).click();
        const shareDialog = page.getByRole('dialog', { name: 'Оқушыларға арналған сілтеме', exact: true });
        await expect(shareDialog).toBeVisible();
        await expect(shareDialog).toContainText(`/lesson/${lesson.id}`);
        await shareDialog.getByRole('button', { name: 'Жабу', exact: true }).click();
        await expect(shareDialog).toBeHidden();
        await expect(menuTrigger).toBeFocused();
        const archiveUrl = `**/api/lessons/${lesson.id}/archive`;
        let releaseArchiveResponse;
        const archiveResponseGate = new Promise(resolve => { releaseArchiveResponse = resolve; });
        await page.route(archiveUrl, async route => {
            await archiveResponseGate;
            await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Archive test failure' }),
            });
        });
        await menuTrigger.click();
        await menu.getByRole('menuitem', { name: 'Мұрағаттау', exact: true }).click();
        await expect(menuTrigger).toBeFocused();
        await expect(menuTrigger).toHaveAttribute('aria-disabled', 'true');
        await menuTrigger.dispatchEvent('click');
        await expect(menu).toBeHidden();
        const searchInput = page.getByLabel('Сабақтарды іздеу', { exact: true });
        await searchInput.focus();
        releaseArchiveResponse();
        await expect(page.getByText('Әрекетті орындау мүмкін болмады', { exact: true })).toBeVisible();
        await expect(searchInput).toBeFocused();
        await expect(menuTrigger).toHaveAttribute('aria-disabled', 'false');
        await page.unroute(archiveUrl);
        await menuTrigger.click();
        await expect(deleteAction).toBeVisible();
        await expect(deleteAction).toBeInViewport();
        if (testInfo.project.name === 'mobile') {
            const box = await menu.boundingBox();
            expect(box).not.toBeNull();
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(320);
        }

        await deleteAction.click();
        const dialog = page.getByRole('dialog', { name: 'Сабақты жою керек пе?', exact: true });
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(title);
        if (testInfo.project.name === 'mobile') {
            const box = await dialog.boundingBox();
            expect(box).not.toBeNull();
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(320);
            expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(2);
        }
        await expect(dialog.getByRole('button', { name: 'Бас тарту', exact: true })).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Жою', exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: 'Бас тарту', exact: true }).click();
        await expect(dialog).toBeHidden();
        await expect(menuTrigger).toBeFocused();
        await expect(card).toBeVisible();
        expect((await request.get(`/api/lessons/${lesson.id}`, { headers: authorization })).status()).toBe(200);

        const deleteUrl = `**/api/lessons/${lesson.id}`;
        let releaseDeleteResponse;
        const deleteResponseGate = new Promise(resolve => { releaseDeleteResponse = resolve; });
        await page.route(deleteUrl, async route => {
            if (route.request().method() !== 'DELETE') return route.continue();
            await deleteResponseGate;
            return route.fulfill({
                status: 409,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: 'Проданный урок нельзя удалить. Переместите его в архив.',
                    code: 'LESSON_HAS_PURCHASES',
                }),
            });
        });
        await menuTrigger.click();
        await menu.getByRole('menuitem', { name: 'Жою', exact: true }).click();
        await dialog.getByRole('button', { name: 'Жою', exact: true }).click();
        await expect(dialog).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(dialog).toBeFocused();
        releaseDeleteResponse();
        await expect(dialog.getByRole('alert')).toHaveText('Сатылған сабақты жоюға болмайды. Оны мұрағатқа жіберіңіз.');
        await expect(dialog.getByRole('button', { name: 'Жою', exact: true })).toBeFocused();
        if (testInfo.project.name === 'mobile') {
            await page.setViewportSize({ width: 568, height: 320 });
            const errorDialogBox = await dialog.boundingBox();
            expect(errorDialogBox.y).toBeGreaterThanOrEqual(0);
            expect(errorDialogBox.y + errorDialogBox.height).toBeLessThanOrEqual(320);
        }
        await page.keyboard.press('Tab');
        await expect(dialog.getByRole('button', { name: 'Бас тарту', exact: true })).toBeFocused();
        await dialog.getByRole('button', { name: 'Бас тарту', exact: true }).click();
        await page.unroute(deleteUrl);
        if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 740 });

        await menuTrigger.click();
        await menu.getByRole('menuitem', { name: 'Жою', exact: true }).click();
        await expect(dialog).toBeVisible();
        const deletion = page.waitForResponse(response => {
            const url = new URL(response.url());
            return response.request().method() === 'DELETE' && url.pathname === `/api/lessons/${lesson.id}`;
        });
        await dialog.getByRole('button', { name: 'Жою', exact: true }).click();
        expect((await deletion).status()).toBe(200);
        await expect(page.getByText('Сабақ жойылды', { exact: true })).toBeVisible();
        await expect(card).toHaveCount(0);
        await expect(page.locator('#my-lessons-heading:focus, [id^="lesson-actions-trigger-"]:focus')).toHaveCount(1);

        const reloaded = page.waitForResponse(response => {
            const url = new URL(response.url());
            return response.request().method() === 'GET' && url.pathname === '/api/lessons' && response.status() === 200;
        });
        await page.reload();
        await reloaded;
        await expect(page.getByRole('article', { name: title, exact: true })).toHaveCount(0);
        expect((await request.get(`/api/lessons/${lesson.id}`, { headers: authorization })).status()).toBe(404);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(2);
    } finally {
        await request.delete(`/api/lessons/${lesson.id}`, { headers: authorization });
    }
});

test('an archived marketplace purchase stays available in read-only presentation mode', async ({ page, request }, testInfo) => {
    const teacherLogin = await request.post('/api/auth/login', {
        data: { email: 'teacher@test.example', password: 'Testing12345' },
    });
    const teacher = await teacherLogin.json();
    expect(teacherLogin.status(), JSON.stringify(teacher)).toBe(200);
    const teacherAuthorization = { Authorization: `Bearer ${teacher.token}` };
    const title = `Purchased archive ${testInfo.project.name} ${Date.now()}`;
    const created = await request.post('/api/lessons', {
        headers: teacherAuthorization,
        data: {
            title,
            subject: 'History',
            grade: 8,
            is_published: true,
            slides_json: [
                { type: 'cover', title },
                {
                    type: 'statistics',
                    title: 'Numbers',
                    stats: [
                        { value: '1234567891', label: 'Long value' },
                        { value: '42%', label: 'Second value' },
                    ],
                },
            ],
        },
    });
    const lesson = await created.json();
    expect(created.status(), JSON.stringify(lesson)).toBe(201);
    expect((await request.post(`/api/marketplace/sell/${lesson.id}`, {
        headers: teacherAuthorization,
        data: { price_tokens: 0 },
    })).status()).toBe(200);

    const buyerRegistration = await request.post('/api/auth/register', {
        data: {
            name: 'Marketplace Buyer',
            email: `marketplace-${testInfo.project.name}-${Date.now()}@test.example`,
            password: 'Testing12345',
        },
    });
    const buyer = await buyerRegistration.json();
    expect(buyerRegistration.status(), JSON.stringify(buyer)).toBe(201);
    const buyerAuthorization = { Authorization: `Bearer ${buyer.token}` };
    expect((await request.post(`/api/marketplace/buy/${lesson.id}`, { headers: buyerAuthorization })).status()).toBe(200);
    expect((await request.patch(`/api/lessons/${lesson.id}/archive`, { headers: teacherAuthorization, data: {} })).status()).toBe(200);

    await page.goto('/');
    await page.evaluate(credentials => {
        localStorage.setItem('auth_token', credentials.token);
        localStorage.setItem('auth_refresh_token', credentials.refreshToken);
        localStorage.setItem('urpaq_language', 'ru');
    }, buyer);
    await page.goto('/marketplace?tab=purchased');
    await expect(page.getByRole('button', { name: 'Мои покупки', exact: true })).toBeVisible();
    await expect(page.getByText(title, { exact: true })).toBeVisible();
    await expect(page.getByText('Архив', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: `Открыть урок: ${title}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/lesson/${lesson.id}/present\\?source=purchased$`));
    await expect(page.getByRole('button', { name: 'Закрыть (Esc)', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Live/ })).toHaveCount(0);
    await page.keyboard.press('ArrowRight');
    const longStatistic = page.getByText('1234567891', { exact: true });
    await expect(longStatistic).toBeVisible();
    expect(await longStatistic.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(2);
    await page.getByRole('button', { name: 'Закрыть (Esc)', exact: true }).click();
    await expect(page).toHaveURL(/\/marketplace\?tab=purchased$/);
    await expect(page.getByRole('link', { name: `Открыть урок: ${title}`, exact: true })).toBeVisible();
    await page.goto(`/lesson/${lesson.id}/present`);
    await expect(page.getByRole('button', { name: 'Закрыть (Esc)', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Live/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Закрыть (Esc)', exact: true }).click();
    await expect(page).toHaveURL(/\/marketplace\?tab=purchased$/);
    await page.getByRole('button', { name: 'Витрина', exact: true }).click();
    await expect(page).toHaveURL(/\/marketplace$/);
    const searched = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname === '/api/marketplace' && url.searchParams.get('search') === 'needle';
    });
    await page.getByPlaceholder('Поиск уроков...').fill('needle');
    expect((await searched).status()).toBe(200);
    await page.reload();
    await expect(page.getByPlaceholder('Поиск уроков...')).toBeVisible();
    await expect(page).toHaveURL(/\/marketplace$/);
});

test('student submits homework and sees honest pending review', async ({ page, request }, testInfo) => {
    await signIn(page, request, true);
    await page.goto('/student/dashboard');
    await expect(page.getByText('Homework task', { exact: true })).toBeVisible();
    await page.goto('/student/assignment/1');
    await page.locator('textarea').fill('My solution is four, with a complete explanation.');
    await page.getByRole('button', { name: 'Үй жұмысын тексеру' }).click();
    await expect(page.getByText('Тексеруді күтуде', { exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/${testInfo.project.name}-student-homework.png`, fullPage: true, animations: 'disabled' });
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
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Toggle Theme' }).click();
    await expect(page.locator('html')).toHaveClass(/theme-dark/);
    if (testInfo.project.name === 'desktop') await expect(page.locator('.profile-summary')).toHaveCSS('flex-direction', 'column');
    await page.screenshot({ path: `test-results/${testInfo.project.name}-dashboard-dark.png`, fullPage: true, animations: 'disabled' });
    expect(errors).toEqual([]);
});
