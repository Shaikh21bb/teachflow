const bcrypt = require('bcryptjs');
const { getDatabase, runQuery } = require('./database.js');

async function seedDatabase() {
    console.log('🌱 Начинаем заполнение базы данных...\n');

    await getDatabase();

    // ===== ДЕМО-ПОЛЬЗОВАТЕЛЬ =====
    console.log('👤 Создаём демо-пользователя...');
    const demoPassword = await bcrypt.hash('demo1234', 10);

    await runQuery(`INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
        ['Айгүл Мұғалімова', 'demo@urpaq.ai', demoPassword, 'teacher']);

    console.log('   ✅ Email: demo@urpaq.ai');
    console.log('   ✅ Пароль: demo1234\n');

    // ===== КЛАССЫ =====
    console.log('🏫 Создаём классы...');
    const classes = [
        { name: '5А', subject: 'Математика', grade: 5 },
        { name: '5Б', subject: 'Математика', grade: 5 },
        { name: '6А', subject: 'Ағылшын тілі', grade: 6 },
        { name: '7А', subject: 'Физика', grade: 7 },
        { name: '7Б', subject: 'Биология', grade: 7 },
        { name: '8А', subject: 'Информатика', grade: 8 },
        { name: '9В', subject: 'Алгебра', grade: 9 },
        { name: '11А', subject: 'Химия', grade: 11 }
    ];

    for (const c of classes) {
        await runQuery(`INSERT INTO classes (name, subject, grade, user_id) VALUES (?, ?, ?, 1)`,
            [c.name, c.subject, c.grade]);
    }
    console.log(`   ✅ Создано ${classes.length} классов\n`);

    // ===== УЧЕНИКИ =====
    console.log('👨‍🎓 Создаём учеников...');
    const studentsByClass = {
        1: [ // 5А - Математика
            { name: 'Арман Сериков', grade: 4.9, status: 'excellent' },
            { name: 'Дана Қасымова', grade: 4.8, status: 'excellent' },
            { name: 'Асқар Тілеуов', grade: 4.5, status: 'good' },
            { name: 'Ақнұр Жұмабаева', grade: 4.3, status: 'good' },
            { name: 'Аяулым Садықова', grade: 4.1, status: 'good' },
            { name: 'Бауыржан Әлиев', grade: 3.8, status: 'average' },
            { name: 'Гүлнұр Оспанова', grade: 3.6, status: 'average' },
            { name: 'Дәурен Мұратов', grade: 3.2, status: 'attention' }
        ],
        2: [ // 5Б - Математика
            { name: 'Еркебұлан Нұрланов', grade: 4.7, status: 'excellent' },
            { name: 'Жансая Бекболатова', grade: 4.4, status: 'good' },
            { name: 'Зарина Тұрсынова', grade: 4.2, status: 'good' },
            { name: 'Ислам Қайратұлы', grade: 3.9, status: 'average' },
            { name: 'Карина Сәрсенова', grade: 3.7, status: 'average' },
            { name: 'Ләззат Маратқызы', grade: 3.4, status: 'attention' }
        ],
        3: [ // 6А - Ағылшын тілі
            { name: 'Мадина Ермекова', grade: 4.9, status: 'excellent' },
            { name: 'Нұрсұлтан Байғанин', grade: 4.6, status: 'good' },
            { name: 'Олжас Темірханов', grade: 4.4, status: 'good' },
            { name: 'Перизат Қожахметова', grade: 4.2, status: 'good' },
            { name: 'Рахат Сейітов', grade: 4.0, status: 'good' },
            { name: 'Сәуле Ахметова', grade: 3.8, status: 'average' },
            { name: 'Тимур Жақсылықов', grade: 3.5, status: 'average' },
            { name: 'Ұлболсын Маликова', grade: 3.3, status: 'attention' }
        ],
        4: [ // 7А - Физика
            { name: 'Фарида Нұрпейісова', grade: 4.8, status: 'excellent' },
            { name: 'Хасан Құрманғазиев', grade: 4.5, status: 'good' },
            { name: 'Шыңғыс Боранбаев', grade: 4.3, status: 'good' },
            { name: 'Ырысбек Төлеуов', grade: 4.1, status: 'good' },
            { name: 'Ерасыл Қанатов', grade: 3.9, status: 'average' },
            { name: 'Әлия Сағымбаева', grade: 3.6, status: 'average' },
            { name: 'Айдос Бекмұратов', grade: 3.4, status: 'attention' }
        ],
        5: [ // 7Б - Биология
            { name: 'Балнұр Есімова', grade: 4.7, status: 'excellent' },
            { name: 'Ғалым Сүлейменов', grade: 4.4, status: 'good' },
            { name: 'Диас Болатов', grade: 4.2, status: 'good' },
            { name: 'Еңлік Мұхтарова', grade: 4.0, status: 'good' },
            { name: 'Жәнібек Сәтбаев', grade: 3.7, status: 'average' },
            { name: 'Инжу Абдрахманова', grade: 3.5, status: 'average' }
        ],
        6: [ // 8А - Информатика
            { name: 'Қайрат Ерғалиев', grade: 4.9, status: 'excellent' },
            { name: 'Лаура Тоқтарова', grade: 4.7, status: 'excellent' },
            { name: 'Марат Жанболатов', grade: 4.5, status: 'good' },
            { name: 'Назерке Асылбекова', grade: 4.3, status: 'good' },
            { name: 'Оңғар Қалиев', grade: 4.0, status: 'good' },
            { name: 'Рауан Есенғазин', grade: 3.8, status: 'average' },
            { name: 'Сұңқар Мырзағалиев', grade: 3.5, status: 'average' }
        ],
        7: [ // 9В - Алгебра
            { name: 'Төлеген Байтұрсынов', grade: 4.8, status: 'excellent' },
            { name: 'Ұлпан Жетпісбаева', grade: 4.6, status: 'good' },
            { name: 'Файзулла Төреханов', grade: 4.4, status: 'good' },
            { name: 'Хадиша Мәмбетова', grade: 4.2, status: 'good' },
            { name: 'Шолпан Ахметжанова', grade: 4.0, status: 'good' },
            { name: 'Ербол Сейітқазин', grade: 3.7, status: 'average' },
            { name: 'Ерболат Құдайбергенов', grade: 3.5, status: 'average' },
            { name: 'Әсем Нұрғазина', grade: 3.2, status: 'attention' }
        ],
        8: [ // 11А - Химия
            { name: 'Айбар Мырзабеков', grade: 4.9, status: 'excellent' },
            { name: 'Бибігүл Өмірзақова', grade: 4.7, status: 'excellent' },
            { name: 'Ғазиза Қалдыбаева', grade: 4.5, status: 'good' },
            { name: 'Дастан Серікұлы', grade: 4.2, status: 'good' },
            { name: 'Елнұр Шәкіров', grade: 3.9, status: 'average' },
            { name: 'Жамиля Рысқұлова', grade: 3.6, status: 'average' }
        ]
    };

    let totalStudents = 0;
    for (const [classId, students] of Object.entries(studentsByClass)) {
        for (const s of students) {
            await runQuery(`INSERT INTO students (name, email, class_id, avg_grade, status) VALUES (?, ?, ?, ?, ?)`,
                [s.name, s.name.toLowerCase().replace(/\s+/g, '.') + '@school.kz', parseInt(classId), s.grade, s.status]);
            totalStudents++;
        }
    }
    console.log(`   ✅ Создано ${totalStudents} учеников\n`);

    // ===== УРОКИ =====
    console.log('📚 Создаём уроки...');
    const lessons = [
        // Математика
        {
            title: 'Бөлшектерге кіріспе',
            subject: 'Математика',
            grade: 5,
            duration: 45,
            description: 'Бөлшек ұғымы мен олардың түрлерін оқып үйрену',
            content: JSON.stringify([
                { type: 'header', text: 'Сабақтың мақсаты' },
                { type: 'text', text: 'Оқушылар бөлшек ұғымымен танысады және жай бөлшектерді оқып, жазуды үйренеді.' },
                { type: 'header', text: 'Негізгі материал' },
                { type: 'text', text: 'Бөлшек - бүтіннің бөлігін білдіреді. Мысалы: 1/2 - жартысы, 1/4 - төрттен бірі.' },
                { type: 'task', text: 'Суреттегі боялған бөліктерді бөлшек түрінде жазыңыз.' }
            ]),
            rating: 4.9,
            ratings_count: 234,
            likes: 567,
            is_published: 1
        },
        {
            title: 'Ондық бөлшектер',
            subject: 'Математика',
            grade: 5,
            duration: 45,
            description: 'Ондық бөлшектерді оқу және жазу',
            content: JSON.stringify([
                { type: 'header', text: 'Ондық бөлшек дегеніміз не?' },
                { type: 'text', text: 'Бөлімі 10, 100, 1000 болатын бөлшектер ондық бөлшектер деп аталады.' },
                { type: 'example', text: '0.5 = 5/10, 0.25 = 25/100' }
            ]),
            rating: 4.8,
            ratings_count: 189,
            likes: 432,
            is_published: 1
        },
        {
            title: 'Теңдеулерді шешу',
            subject: 'Математика',
            grade: 5,
            duration: 40,
            description: 'Қарапайым теңдеулерді шешу тәсілдері',
            content: JSON.stringify([
                { type: 'header', text: 'Теңдеу дегеніміз не?' },
                { type: 'text', text: 'Белгісіз санды x арқылы белгілеп, оны табуға арналған сөйлем теңдеу деп аталады.' },
                { type: 'task', text: 'x + 5 = 12 теңдеуін шешіңіз.' }
            ]),
            rating: 4.7,
            ratings_count: 156,
            likes: 345,
            is_published: 1
        },
        // Физика
        {
            title: 'Ньютон заңдары',
            subject: 'Физика',
            grade: 7,
            duration: 45,
            description: 'Ньютонның динамика туралы үш заңы',
            content: JSON.stringify([
                { type: 'header', text: 'Бірінші заң - инерция заңы' },
                { type: 'text', text: 'Егер денеге басқа денелер әсер етпесе немесе олардың әсері теңгерілсе, дене тыныштықта немесе түзусызықты бірқалыпты қозғалыста болады.' },
                { type: 'header', text: 'Екінші заң' },
                { type: 'formula', text: 'F = ma' },
                { type: 'header', text: 'Үшінші заң' },
                { type: 'text', text: 'Денелер бір-біріне шамалары тең, бағыттары қарама-қарсы күштермен әсер етеді.' }
            ]),
            rating: 4.8,
            ratings_count: 198,
            likes: 412,
            is_published: 1
        },
        {
            title: 'Механикалық қозғалыс',
            subject: 'Физика',
            grade: 7,
            duration: 45,
            description: 'Қозғалыс түрлері және жылдамдық',
            content: JSON.stringify([
                { type: 'header', text: 'Қозғалыс дегеніміз не?' },
                { type: 'text', text: 'Дененің уақыт өте келе басқа денелерге қатысты орнын өзгертуі механикалық қозғалыс деп аталады.' },
                { type: 'formula', text: 'v = s/t' }
            ]),
            rating: 4.6,
            ratings_count: 145,
            likes: 320,
            is_published: 1
        },
        // Ағылшын тілі
        {
            title: 'Present Simple Tense',
            subject: 'Ағылшын тілі',
            grade: 6,
            duration: 40,
            description: 'Ағылшын тіліндегі қарапайым осы шақ',
            content: JSON.stringify([
                { type: 'header', text: 'Present Simple қашан қолданылады?' },
                { type: 'text', text: 'Әдеттегі әрекеттер, фактілер, кесте бойынша болатын іс-әрекеттер үшін қолданылады.' },
                { type: 'example', text: 'I go to school every day. She speaks English.' },
                { type: 'rule', text: 'He/She/It + verb + s/es' }
            ]),
            rating: 4.7,
            ratings_count: 167,
            likes: 389,
            is_published: 1
        },
        {
            title: 'Past Simple Tense',
            subject: 'Ағылшын тілі',
            grade: 6,
            duration: 40,
            description: 'Өткен шақ және ережелері',
            content: JSON.stringify([
                { type: 'header', text: 'Past Simple' },
                { type: 'text', text: 'Өткен уақытта болған әрекеттерді сипаттайды.' },
                { type: 'example', text: 'I visited my grandmother yesterday.' }
            ]),
            rating: 4.5,
            ratings_count: 134,
            likes: 278,
            is_published: 1
        },
        // Информатика
        {
            title: 'Scratch-тағы циклдер',
            subject: 'Информатика',
            grade: 8,
            duration: 45,
            description: 'Программалаудағы циклдер және олардың түрлері',
            content: JSON.stringify([
                { type: 'header', text: 'Цикл дегеніміз не?' },
                { type: 'text', text: 'Цикл - бір әрекетті бірнеше рет қайталауға мүмкіндік беретін алгоритмдік құрылым.' },
                { type: 'example', text: '10 рет қайтала: алға жүр, оңға бұрыл' }
            ]),
            rating: 4.9,
            ratings_count: 289,
            likes: 567,
            is_published: 1
        },
        {
            title: 'Python-ға кіріспе',
            subject: 'Информатика',
            grade: 8,
            duration: 45,
            description: 'Python бағдарламалау тілінің негіздері',
            content: JSON.stringify([
                { type: 'header', text: 'Python дегеніміз не?' },
                { type: 'text', text: 'Python - қарапайым және қуатты бағдарламалау тілі.' },
                { type: 'code', text: 'print("Сәлем, Әлем!")' }
            ]),
            rating: 4.8,
            ratings_count: 256,
            likes: 489,
            is_published: 1
        },
        // Биология
        {
            title: 'Фотосинтез процесі',
            subject: 'Биология',
            grade: 7,
            duration: 45,
            description: 'Өсімдіктердегі фотосинтез',
            content: JSON.stringify([
                { type: 'header', text: 'Фотосинтез дегеніміз не?' },
                { type: 'text', text: 'Фотосинтез - өсімдіктердің жарық энергиясын пайдаланып, көмірқышқыл газы мен судан органикалық зат түзу процесі.' },
                { type: 'formula', text: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂' }
            ]),
            rating: 4.6,
            ratings_count: 178,
            likes: 356,
            is_published: 1
        },
        {
            title: 'Жасуша құрылысы',
            subject: 'Биология',
            grade: 7,
            duration: 45,
            description: 'Тірі организмдердің негізгі құрылымдық бірлігі',
            content: JSON.stringify([
                { type: 'header', text: 'Жасуша' },
                { type: 'text', text: 'Жасуша - барлық тірі организмдердің құрылымдық және функционалдық бірлігі.' },
                { type: 'list', items: ['Ядро', 'Цитоплазма', 'Жасуша қабығы', 'Митохондрия'] }
            ]),
            rating: 4.7,
            ratings_count: 189,
            likes: 398,
            is_published: 1
        },
        // Химия
        {
            title: 'Периодтық жүйе',
            subject: 'Химия',
            grade: 11,
            duration: 45,
            description: 'Менделеевтің периодтық заңы',
            content: JSON.stringify([
                { type: 'header', text: 'Периодтық заң' },
                { type: 'text', text: 'Элементтердің қасиеттері олардың атомдық массаларының периодты функциясы болып табылады.' }
            ]),
            rating: 4.8,
            ratings_count: 167,
            likes: 345,
            is_published: 1
        },
        {
            title: 'Химиялық реакциялар',
            subject: 'Химия',
            grade: 11,
            duration: 45,
            description: 'Химиялық реакция түрлері',
            content: JSON.stringify([
                { type: 'header', text: 'Реакция түрлері' },
                { type: 'list', items: ['Қосылу', 'Ыдырау', 'Алмасу', 'Орын басу'] }
            ]),
            rating: 4.5,
            ratings_count: 134,
            likes: 267,
            is_published: 1
        },
        // Алгебра
        {
            title: 'Квадрат теңдеулер',
            subject: 'Алгебра',
            grade: 9,
            duration: 45,
            description: 'Квадрат теңдеулерді шешу формулалары',
            content: JSON.stringify([
                { type: 'header', text: 'Квадрат теңдеу' },
                { type: 'formula', text: 'ax² + bx + c = 0' },
                { type: 'text', text: 'Дискриминант: D = b² - 4ac' },
                { type: 'formula', text: 'x = (-b ± √D) / 2a' }
            ]),
            rating: 4.9,
            ratings_count: 234,
            likes: 512,
            is_published: 1
        },
        {
            title: 'Функциялар және графиктер',
            subject: 'Алгебра',
            grade: 9,
            duration: 45,
            description: 'Функция ұғымы және оның графигі',
            content: JSON.stringify([
                { type: 'header', text: 'Функция дегеніміз не?' },
                { type: 'text', text: 'y = f(x) функциясы x аргументінің әр мәніне бір ғана y мәнін сәйкес қояды.' }
            ]),
            rating: 4.7,
            ratings_count: 178,
            likes: 389,
            is_published: 1
        },
        // Қосымша сабақтар
        {
            title: 'Геометриялық фигуралар',
            subject: 'Математика',
            grade: 5,
            duration: 40,
            description: 'Негізгі геометриялық фигуралар',
            content: JSON.stringify([
                { type: 'header', text: 'Фигуралар' },
                { type: 'list', items: ['Үшбұрыш', 'Төртбұрыш', 'Шеңбер', 'Параллелограмм'] }
            ]),
            rating: 4.6,
            ratings_count: 145,
            likes: 298,
            is_published: 1
        },
        {
            title: 'Conditionals (If-clauses)',
            subject: 'Ағылшын тілі',
            grade: 6,
            duration: 45,
            description: 'Шартты сөйлемдер',
            content: JSON.stringify([
                { type: 'header', text: 'Бірінші типті шартты сөйлем' },
                { type: 'example', text: 'If it rains, I will stay home.' }
            ]),
            rating: 4.5,
            ratings_count: 123,
            likes: 245,
            is_published: 1
        },
        {
            title: 'Тартылыс заңы',
            subject: 'Физика',
            grade: 7,
            duration: 45,
            description: 'Ньютонның бүкіләлемдік тартылыс заңы',
            content: JSON.stringify([
                { type: 'header', text: 'Тартылыс заңы' },
                { type: 'formula', text: 'F = G(m₁m₂)/r²' }
            ]),
            rating: 4.7,
            ratings_count: 156,
            likes: 334,
            is_published: 1
        },
        {
            title: 'Циклдер в Python',
            subject: 'Информатика',
            grade: 8,
            duration: 45,
            description: 'for және while циклдері',
            content: JSON.stringify([
                { type: 'code', text: 'for i in range(10):\n    print(i)' }
            ]),
            rating: 4.8,
            ratings_count: 189,
            likes: 423,
            is_published: 1
        },
        {
            title: 'ДНҚ құрылысы',
            subject: 'Биология',
            grade: 7,
            duration: 45,
            description: 'Дезоксирибонуклеин қышқылы',
            content: JSON.stringify([
                { type: 'header', text: 'ДНҚ' },
                { type: 'text', text: 'ДНҚ - тұқым қуалаушылық ақпаратты сақтайтын молекула.' }
            ]),
            rating: 4.6,
            ratings_count: 167,
            likes: 356,
            is_published: 1
        }
    ];

    for (const l of lessons) {
        await runQuery(`INSERT INTO lessons (title, subject, grade, duration, description, content, rating, ratings_count, likes, is_published, user_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [l.title, l.subject, l.grade, l.duration, l.description, l.content, l.rating, l.ratings_count, l.likes, l.is_published]);
    }
    console.log(`   ✅ Создано ${lessons.length} уроков\n`);

    // ===== ТАПСЫРМАЛАР =====
    console.log('📝 Создаём задания...');
    const today = new Date();
    const assignments = [
        { title: 'Бақылау жұмысы: Бөлшектер', type: 'test', class_id: 1, days: 2, submitted: 24, total: 28 },
        { title: 'Үй жұмысы: Ньютон заңдары', type: 'homework', class_id: 4, days: 1, submitted: 18, total: 26 },
        { title: 'Тест: Present Simple', type: 'quiz', class_id: 3, days: -1, submitted: 25, total: 25, status: 'completed' },
        { title: 'Эссе: My Future Profession', type: 'homework', class_id: 3, days: 3, submitted: 12, total: 24 },
        { title: 'Лабораториялық жұмыс: Фотосинтез', type: 'homework', class_id: 5, days: -2, submitted: 25, total: 25, status: 'graded' },
        { title: 'Практика: Python негіздері', type: 'homework', class_id: 6, days: 4, submitted: 15, total: 28 },
        { title: 'Тест: Квадрат теңдеулер', type: 'test', class_id: 7, days: 1, submitted: 20, total: 28 },
        { title: 'Бақылау: Периодтық жүйе', type: 'test', class_id: 8, days: 5, submitted: 10, total: 24 },
        { title: 'Үй жұмысы: Ондық бөлшектер', type: 'homework', class_id: 2, days: 2, submitted: 16, total: 22 },
        { title: 'Викторина: Механика', type: 'quiz', class_id: 4, days: 0, submitted: 22, total: 26 },
        { title: 'Проект: Жасуша моделі', type: 'homework', class_id: 5, days: 7, submitted: 5, total: 20 },
        { title: 'Тест: Past Simple', type: 'quiz', class_id: 3, days: -3, submitted: 24, total: 24, status: 'graded' },
        { title: 'Үй жұмысы: Scratch анимация', type: 'homework', class_id: 6, days: 3, submitted: 18, total: 28 },
        { title: 'Бақылау: Функциялар', type: 'test', class_id: 7, days: 6, submitted: 8, total: 28 },
        { title: 'Лабораториялық: Химиялық реакциялар', type: 'homework', class_id: 8, days: 4, submitted: 12, total: 24 }
    ];

    for (const a of assignments) {
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + a.days);
        const status = a.status || 'active';

        await runQuery(`INSERT INTO assignments (title, type, class_id, due_date, submitted, total, status, user_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [a.title, a.type, a.class_id, dueDate.toISOString().split('T')[0], a.submitted, a.total, status]);
    }
    console.log(`   ✅ Создано ${assignments.length} заданий\n`);

    // ===== УВЕДОМЛЕНИЯ =====
    console.log('🔔 Создаём уведомления...');
    const notifications = [
        { icon: '✅', type: 'success', text: '5А сыныбы: 24 оқушыдан 28 тапсырманы тапсырды' },
        { icon: '💬', type: 'info', text: '"Бөлшектерге кіріспе" сабағына жаңа пікір жазылды' },
        { icon: '⚠️', type: 'warning', text: 'Ертең 7А сыныбына Физика бойынша дедлайн!' },
        { icon: '🎉', type: 'success', text: 'Сіздің сабағыңыз "Топ сабақ" мәртебесін алды!' },
        { icon: '📊', type: 'info', text: 'Апталық есеп дайын - статистиканы қараңыз' },
        { icon: '👨‍🎓', type: 'info', text: 'Жаңа оқушы 6А сыныбына қосылды' },
        { icon: '⭐', type: 'success', text: 'Сіздің сабағыңызға 50 жаңа лайк қойылды!' },
        { icon: '📝', type: 'info', text: '9В сыныбы тест тапсырмасын бастады' },
        { icon: '🔔', type: 'warning', text: '3 оқушы тапсырманы әлі тапсырған жоқ' },
        { icon: '📚', type: 'info', text: 'Жаңа сабақтар кітапханаға қосылды' }
    ];

    for (let i = 0; i < notifications.length; i++) { const n = notifications[i];
        const createdAt = new Date(today);
        createdAt.setMinutes(createdAt.getMinutes() - (i * 30)); // Каждое уведомление на 30 минут раньше

        await runQuery(`INSERT INTO notifications (icon, type, text, user_id, created_at) VALUES (?, ?, ?, 1, ?)`,
            [n.icon, n.type, n.text, createdAt.toISOString()]);
    }
    console.log(`   ✅ Создано ${notifications.length} уведомлений\n`);

    // ===== СОХРАНЁННЫЕ МАТЕРИАЛЫ =====
    console.log('📌 Создаём сохранённые материалы...');
    const savedMaterials = [
        { lesson_id: 1, title: 'Бөлшектерге кіріспе', notes: 'Келесі аптаға дайындау' },
        { lesson_id: 4, title: 'Ньютон заңдары', notes: 'Практикалық сабаққа материал' },
        { lesson_id: 8, title: 'Scratch-тағы циклдер', notes: 'Жаңа тақырып' },
        { lesson_id: 14, title: 'Квадрат теңдеулер', notes: 'ҰБТ-ға дайындық' },
        { lesson_id: 6, title: 'Present Simple Tense', notes: 'Қайталау материалы' }
    ];

    for (const m of savedMaterials) {
        await runQuery(`INSERT INTO saved_materials (user_id, lesson_id, title, type, notes) VALUES (1, ?, ?, 'lesson', ?)`,
            [m.lesson_id, m.title, m.notes]);
    }
    console.log(`   ✅ Создано ${savedMaterials.length} сохранённых материалов\n`);

    // ===== СОХРАНЕНИЕ БД =====
    console.log('═══════════════════════════════════════════');
    console.log('✅ База данных успешно создана!');
    console.log('═══════════════════════════════════════════');
    console.log('\n📊 Статистика:');
    console.log(`   • Пользователей: 1`);
    console.log(`   • Классов: ${classes.length}`);
    console.log(`   • Учеников: ${totalStudents}`);
    console.log(`   • Уроков: ${lessons.length}`);
    console.log(`   • Заданий: ${assignments.length}`);
    console.log(`   • Уведомлений: ${notifications.length}`);
    console.log(`   • Сохранённых материалов: ${savedMaterials.length}`);
    console.log('\n🔐 Демо-аккаунт:');
    console.log('   Email: demo@urpaq.ai');
    console.log('   Пароль: demo1234');
    console.log('\n🚀 Перезапустите сервер: npm run dev');
}

seedDatabase().catch(console.error);
