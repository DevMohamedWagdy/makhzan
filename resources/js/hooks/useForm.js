import { useCallback, useState } from 'react';
import { validate } from '@/lib/validators';

/**
 * Lightweight form state: values, per-field errors, blur/submit validation.
 * @param {object} initialValues
 * @param {Record<string, Function[]> | ((values: object) => Record<string, Function[]>)} schema
 */
export function useForm(initialValues, schema = {}) {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});

    const resolveSchema = useCallback((currentValues) => (typeof schema === 'function' ? schema(currentValues) : schema), [schema]);

    const setField = useCallback(
        (name, value) => {
            const next = { ...values, [name]: value };

            setValues(next);

            // Re-validate live only after the field has shown an error, so typing isn't noisy.
            if (errors[name]) {
                const fieldSchema = resolveSchema(next)[name];
                const fieldErrors = fieldSchema ? validate({ [name]: fieldSchema }, next) : {};

                setErrors((previous) => {
                    const { [name]: _removed, ...rest } = previous;

                    return fieldErrors[name] ? { ...rest, [name]: fieldErrors[name] } : rest;
                });
            }
        },
        [errors, resolveSchema, values],
    );

    const bind = useCallback(
        (name) => ({
            name,
            value: values[name] ?? '',
            onChange: (event) => setField(name, event.target.type === 'checkbox' ? event.target.checked : event.target.value),
            onBlur: () => {
                const fieldSchema = resolveSchema(values)[name];

                if (fieldSchema && values[name] !== '' && values[name] != null) {
                    const fieldErrors = validate({ [name]: fieldSchema }, values);

                    setErrors((previous) => {
                        const { [name]: _removed, ...rest } = previous;

                        return fieldErrors[name] ? { ...rest, [name]: fieldErrors[name] } : rest;
                    });
                }
            },
            'aria-invalid': errors[name] ? 'true' : undefined,
        }),
        [errors, resolveSchema, setField, values],
    );

    /** Validates the given fields (or the whole schema); returns true when valid. */
    const validateFields = useCallback(
        (fields) => {
            const fullSchema = resolveSchema(values);
            const scoped = fields ? Object.fromEntries(fields.filter((field) => fullSchema[field]).map((field) => [field, fullSchema[field]])) : fullSchema;
            const nextErrors = validate(scoped, values);

            setErrors((previous) => {
                const kept = Object.fromEntries(Object.entries(previous).filter(([key]) => !(key in scoped)));

                return { ...kept, ...nextErrors };
            });

            return Object.keys(nextErrors).length === 0;
        },
        [resolveSchema, values],
    );

    const reset = useCallback((nextValues = initialValues) => {
        setValues(nextValues);
        setErrors({});
    }, [initialValues]);

    return { values, errors, setErrors, setField, setValues, bind, validateFields, reset };
}
