/* eslint-env node */
module.exports = {
    root: true,
    extends: ['universe/native'],
    plugins: ['simple-import-sort'],
    rules: {
        'import/order': 'off',
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        'import/first': 'error',
        'import/newline-after-import': 'error',
        'import/no-duplicates': 'error',
    },
};
