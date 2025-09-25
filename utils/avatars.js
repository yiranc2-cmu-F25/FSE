const colors = [
  '#2EA328',
  '#148ADE',
  '#A32828',
  '#28A38A',
  '#A39128',
  '#2870A3',
  '#A34D28',
  '#284FA3',
  '#DECD14',
  '#BC5656',
  '#7D28A3',
]

export function getAvatarColor(name) {
    const charIndex = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
    return colors[charIndex % colors.length];
}

export function getInitials(name) {
    const nameParts = name.split(' ');
    if (nameParts.length === 1) {
        return nameParts[0].charAt(0).toUpperCase();
    } else {
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    }
}
