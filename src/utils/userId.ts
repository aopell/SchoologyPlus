export const getUserId = async () => {
    // Disable follow redirects
    const redirect = await fetch('/user', { redirect: 'follow' }).catch(() => undefined);

    if (redirect === undefined) {
        return;
    }

    // Split the URL by slashes and return the last element
    const url = redirect.url.split('/');

    return url[url.length - 2];
};
