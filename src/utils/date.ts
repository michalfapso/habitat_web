/**
 * Localizes a date into a human-readable format.
 * @param date - The Date object to format.
 * @param locale - The current language ('sk' or 'cz').
 * @returns A localized string (e.g., "30. január 2026").
 */
export function formatLocalizedDate(date: Date, locale: 'sk' | 'cz'): string {
    const months = {
        sk: [
            'január', 'február', 'marec', 'apríl', 'máj', 'jún',
            'júl', 'august', 'september', 'október', 'november', 'december'
        ],
        cz: [
            'leden', 'únor', 'březen', 'duben', 'květen', 'červen',
            'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'
        ]
    };

    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();

    const monthName = months[locale][monthIndex];

    return `${day}. ${monthName} ${year}`;
}
