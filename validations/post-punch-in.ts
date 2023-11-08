import { z } from 'zod';

export const SchemaPostPunchIn = z.object({
    punchType: z.string(),
    punchLatitude: z.nullable(z.string()),
    punchLongitude: z.nullable(z.string()),
    punchAction: z.nullable(z.string()),
    punchDateTime: z.string(),
    punchTimezone: z.string(),
});

export type PostPunchIn = z.infer<typeof SchemaPostPunchIn>;
