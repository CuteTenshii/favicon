# Favicon

[![Built with Cloudflare](https://workers.cloudflare.com/built-with-cloudflare.svg)](https://cloudflare.com)

A Cloudflare Worker that serve a website's favicon from a given URL. Useful for quickly retrieving favicons without needing to scrape the website yourself.

## Usage

```
https://favicons.tenshii.moe/?url=https://example.com/
```

The worker will try predefined paths for the favicon, such as `/favicon.ico`, `/favicon.png`, and `/apple-touch-icon.png`.
If none of these paths are found, it will try to fetch the website's HTML and parse the `<link rel="icon">` tags to find the favicon URL.

If a favicon is found, it will be served with the original content type (e.g., `image/png`, `image/x-icon`, etc.) and a 200 status code.

If no favicon is found, a 404 error will be returned.

### Parameters

- `url`: The URL of the website to fetch the favicon from. This parameter is required.
- `from_html`: If set to any value, the worker will try to fetch the favicon without checking the predefined paths. This is useful for websites that do not have a favicon at the standard locations.

## Caching

Images expire after one week, this means that after one week they'll be refetched.

## Limitations

- If the worker is unable to find a favicon, it will return a 404 error.
- WAF (Web Application Firewall) rules may block the request if the target website has strict security measures in place. This includes sites using [Cloudflare Bot Management](https://www.cloudflare.com/application-services/products/bot-management/), [Akamai Bot Manager](https://www.akamai.com/products/bot-manager) or similar services.

## License

This project is licensed under the MIT License. See the [LICENSE.txt](LICENSE.txt) file for details.
