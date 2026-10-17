/** Reading config values as CraftEngine's checks need them, shared by the CraftEngine validations. */

/** A value CraftEngine's templates fill in (a `${argument}`) is only known once the template is applied. */
export const isTemplated = (text: string): boolean => text.includes('${');

/** A value that may be one entry or a list as a list; a missing or empty (`null`) value is an empty list. */
export const asList = (value: unknown): unknown[] => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);
