/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'],
            },
            fontSize: {
                'display-4xl': ['2.25rem', { fontWeight: '700', lineHeight: '2.5rem', letterSpacing: '-0.02em' }], // text-4xl font-bold
                'display-3xl': ['1.875rem', { fontWeight: '800', lineHeight: '2.25rem', letterSpacing: '-0.02em' }], // text-3xl font-extrabold tracking-tight
                'display-2xl': ['1.5rem', { fontWeight: '600', lineHeight: '2rem' }], // text-2xl font-semibold
                'display-xl': ['1.25rem', { fontWeight: '700', lineHeight: '1.75rem' }], // text-xl font-bold
                'body-base': ['0.875rem', { fontWeight: '400', lineHeight: '1.5rem' }], // text-sm font-normal leading-relaxed
                'body-small': ['0.8125rem', { fontWeight: '400', lineHeight: '1.25rem' }], // text-[13px]
                'meta': ['0.75rem', { fontWeight: '700', lineHeight: '1rem', letterSpacing: '0.1em' }], // text-xs font-bold uppercase tracking-wider
            },
            colors: {
                gray: {
                    900: '#111827', // Consistent with design rule
                },
            },
        },
    },
    plugins: [],
}
