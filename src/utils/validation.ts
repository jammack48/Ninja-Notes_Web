import { z } from 'zod';

// Task validation schema
export const TaskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string().datetime().optional(),
  completed: z.boolean(),
  createdAt: z.string().datetime().optional(),
  actionType: z.enum(['reminder', 'call', 'text', 'email', 'note']).optional(),
  scheduledFor: z.string().datetime().optional(),
  contactInfo: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
});

export type ValidatedTask = z.infer<typeof TaskSchema>;

// Contact info validation
export const ContactInfoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number').optional(),
  email: z.string().email('Invalid email address').optional(),
});

// Scheduled action validation
export const ScheduledActionSchema = z.object({
  id: z.string().uuid().optional(),
  task_id: z.string().uuid(),
  action_type: z.enum(['reminder', 'call', 'text', 'email', 'note']),
  scheduled_for: z.string().datetime(),
  contact_info: ContactInfoSchema.optional(),
  notification_settings: z.object({
    web_push: z.boolean(),
    email: z.boolean(),
    sms: z.boolean(),
  }),
  status: z.enum(['pending', 'completed', 'failed']),
});

// Audio data validation
export const AudioDataSchema = z.object({
  audio: z.string().min(1, 'Audio data is required'),
  duration: z.number().positive().optional(),
  format: z.string().optional(),
});

// Validation helper functions
export const validateTask = (data: unknown): ValidatedTask => {
  return TaskSchema.parse(data);
};

export const validateContactInfo = (data: unknown) => {
  return ContactInfoSchema.parse(data);
};

export const validateScheduledAction = (data: unknown) => {
  return ScheduledActionSchema.parse(data);
};

export const validateAudioData = (data: unknown) => {
  return AudioDataSchema.parse(data);
};

// Safe validation (returns result with success/error)
export const safeValidateTask = (data: unknown) => {
  return TaskSchema.safeParse(data);
};

export const safeValidateContactInfo = (data: unknown) => {
  return ContactInfoSchema.safeParse(data);
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
};

export const sanitizeContactInfo = (contactInfo: any): any => {
  if (!contactInfo || typeof contactInfo !== 'object') {
    return undefined;
  }
  
  return {
    name: contactInfo.name ? sanitizeInput(contactInfo.name) : undefined,
    phone: contactInfo.phone ? sanitizeInput(contactInfo.phone) : undefined,
    email: contactInfo.email ? sanitizeInput(contactInfo.email) : undefined,
  };
};

// Type guards
export const isValidTask = (data: unknown): data is ValidatedTask => {
  return TaskSchema.safeParse(data).success;
};

export const isValidContactInfo = (data: unknown): data is z.infer<typeof ContactInfoSchema> => {
  return ContactInfoSchema.safeParse(data).success;
};