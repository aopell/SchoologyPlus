

// an img per domain
// to check if images load







let themes = [];
for (let t of __defaultThemes) {
    themes.push(Theme.loadFromObject(t));
}