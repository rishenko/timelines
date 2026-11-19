// A form field's error, tied to the field (WCAG 3.3.1 and 1.3.1): the field gets aria-invalid and aria-describedby
// pointing at the message, so a screen reader reads the message with the field, and the message is announced when it
// appears (role="alert").

interface Problem {
  message?: string;
}

/** Props for a field (or a fieldset) that may have an error: spread them after `register(...)`. */
export function errorProps(id: string, error: Problem | undefined) {
  return error ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {};
}

/** The error message for the field `id`, if there is one. */
export function FieldError({ id, error }: { id: string; error: Problem | undefined }) {
  return error ? (
    <p role="alert" id={`${id}-error`}>
      {error.message}
    </p>
  ) : null;
}
