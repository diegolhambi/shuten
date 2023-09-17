export type PunchType =
    | 'punch'
    | 'weekend'
    | 'absence'
    | 'dayOff'
    | 'holiday'
    | 'vacation';

export type Punch = {
    /*
     * Type of the punch
     */
    type: PunchType;
    /*
     * Local time formatted hh:mm
     */
    time: string;
    /*
     * If this punch has been calculated by the app
     */
    predicted?: boolean;
};
