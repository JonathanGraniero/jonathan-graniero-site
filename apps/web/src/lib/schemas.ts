import { z } from 'zod';

/** Mirrors the API's ContactDto rules so users get instant, identical feedback. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(100),
  email: z.email('Please enter a valid email address').max(200),
  message: z
    .string()
    .trim()
    .min(10, 'Message should be at least 10 characters')
    .max(5000, 'Message is too long (5000 characters max)'),
  website: z.string().optional(),
});

export type ContactValues = z.infer<typeof contactSchema>;

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password is at least 8 characters'),
});

export type LoginValues = z.infer<typeof loginSchema>;

const optionalUrl = z.union([z.literal(''), z.url('Must be a full URL (https://…)')]);

export const postSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  slug: z.union([
    z.literal(''),
    z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and dashes only')
      .max(120),
  ]),
  excerpt: z.string().trim().min(1, 'A short excerpt is required').max(500),
  contentMd: z.string().min(1, 'Write something first'),
  coverImage: optionalUrl,
  tags: z.array(z.string()).max(10, 'At most 10 tags'),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

export type PostFormValues = z.infer<typeof postSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  headline: z.string().trim().max(200),
  bio: z.string().max(10_000),
  location: z.string().trim().max(100),
  avatarUrl: optionalUrl,
  resumeUrl: optionalUrl,
  github: optionalUrl,
  linkedin: optionalUrl,
  website: optionalUrl,
  email: z.union([z.literal(''), z.email('Enter a valid email')]),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
