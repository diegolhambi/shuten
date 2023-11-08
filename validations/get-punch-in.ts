import { z } from 'zod';

export const SchemaGetPunchIn = z.object({
    exceptionClockIn: z.boolean(),
    punchDisabled: z.boolean(),
    enableEntranceExitButtons: z.boolean(),
    serverTime: z.string(),
    lastPunches: z.array(
        z.object({
            _id: z.string(),
            orgoid: z.string(),
            associateoid: z.string(),
            employeeKey: z.string(),
            punchDateTime: z.string(),
            punchTimezone: z.string(),
            punchAction: z.nullable(z.string()),
            status: z.string(),
            punchType: z.string(),
            punchLatitude: z.nullable(z.string()),
            punchLongitude: z.nullable(z.string()),
            createdAt: z.string(),
            updatedAt: z.string(),
            __v: z.number(),
            importResult: z.object({
                hash: z.string(),
                message: z.string(),
            }),
        }),
    ),
});

export type GetPunchIn = z.infer<typeof SchemaGetPunchIn>;
