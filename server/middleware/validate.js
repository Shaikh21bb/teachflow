const { z } = require('zod');

// ──────────────────────────────────────────
// Zod Schemas
// ──────────────────────────────────────────

const registerSchema = z.object({
    name: z
        .string({ required_error: 'Имя обязательно' })
        .min(2, 'Имя должно быть минимум 2 символа')
        .max(100, 'Имя слишком длинное')
        .trim(),
    email: z
        .string({ required_error: 'Email обязателен' })
        .email('Неверный формат email')
        .toLowerCase()
        .trim(),
    password: z
        .string({ required_error: 'Пароль обязателен' })
        .min(8, 'Пароль должен быть минимум 8 символов')
        .max(128, 'Пароль слишком длинный')
        .refine(
            (val) => /[A-Za-zА-Яа-яЁё]/.test(val) || /\d/.test(val),
            'Пароль должен содержать буквы или цифры'
        ),
    subjects: z.array(z.string()).optional().default([]),
    role: z.enum(['teacher', 'student']).optional().default('teacher'),
});

const loginSchema = z.object({
    email: z
        .string({ required_error: 'Email обязателен' })
        .email('Неверный формат email')
        .toLowerCase()
        .trim(),
    password: z
        .string({ required_error: 'Пароль обязателен' })
        .min(1, 'Пароль обязателен'),
});

const profileSchema = z.object({
    name: z
        .string({ required_error: 'Имя обязательно' })
        .min(2, 'Имя должно быть минимум 2 символа')
        .max(100, 'Имя слишком длинное')
        .trim(),
    subjects: z.array(z.string()).optional().default([]),
});

const passwordChangeSchema = z.object({
    oldPassword: z.string({ required_error: 'Текущий пароль обязателен' }).min(1),
    newPassword: z
        .string({ required_error: 'Новый пароль обязателен' })
        .min(8, 'Новый пароль должен быть минимум 8 символов')
        .max(128, 'Пароль слишком длинный')
        .refine(
            (val) => /[A-Za-zА-Яа-яЁё]/.test(val) || /\d/.test(val),
            'Пароль должен содержать буквы или цифры'
        ),
});

const forgotPasswordSchema = z.object({
    email: z.string().email('Неверный формат email').toLowerCase().trim(),
});

const resetPasswordSchema = z.object({
    token: z.string({ required_error: 'Токен отсутствует' }).min(1),
    password: z
        .string({ required_error: 'Новый пароль обязателен' })
        .min(8, 'Новый пароль должен быть минимум 8 символов')
        .max(128)
        .refine(
            (val) => /[A-Za-zА-Яа-яЁё]/.test(val) || /\d/.test(val),
            'Пароль должен содержать буквы или цифры'
        ),
});

const lessonSchema = z.object({
    title: z
        .string({ required_error: 'Название урока обязательно' })
        .min(3, 'Название слишком короткое')
        .max(200, 'Название слишком длинное')
        .trim(),
    subject: z.string().max(100).trim().optional(),
    grade: z
        .number()
        .int()
        .min(1, 'Класс должен быть от 1 до 12')
        .max(12, 'Класс должен быть от 1 до 12')
        .optional()
        .nullable(),
    duration: z.number().int().min(1).max(300).optional().default(45),
    description: z.string().max(2000).trim().optional(),
    content: z.string().max(50000).optional(),
});

const assignmentSchema = z.object({
    title: z
        .string({ required_error: 'Название задания обязательно' })
        .min(3, 'Название слишком короткое')
        .max(200)
        .trim(),
    type: z.enum(['homework', 'test', 'project', 'quiz']).optional().default('homework'),
    class_id: z
        .number({ required_error: 'Класс обязателен' })
        .int()
        .positive(),
    instructions: z.string().max(5000).trim().optional().default(''),
    answer_key: z.string().max(5000).trim().optional().default(''),
    max_score: z.number().int().min(1).max(1000).optional().default(100),
    due_date: z
        .string()
        .optional()
        .nullable(),
});

const classSchema = z.object({
    name: z
        .string({ required_error: 'Название класса обязательно' })
        .min(1, 'Название класса обязательно')
        .max(100)
        .trim(),
    subject: z.string().max(100).trim().optional(),
    grade: z.number().int().min(1).max(12).optional().nullable(),
});

// ──────────────────────────────────────────
// Middleware factory
// ──────────────────────────────────────────
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.issues.map((e) => e.message);
        return res.status(400).json({
            error: errors[0], // first error message for UX
            details: errors,  // all errors for debugging
        });
    }
    // Replace body with parsed (trimmed, lowercased, defaulted) data
    req.body = result.data;
    next();
};

module.exports = {
    validate,
    registerSchema,
    loginSchema,
    lessonSchema,
    assignmentSchema,
    classSchema,
    profileSchema,
    passwordChangeSchema,
    forgotPasswordSchema,
    resetPasswordSchema
};
