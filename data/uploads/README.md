# Uploads Directory

This directory is used for temporarily storing uploaded CSV files for processing. Files are stored here when users upload content through the CSV uploader interface.

CSV files should follow the format:
```
title,url,text,pubDate,guid
"Article Title","https://example.com/article","Article content...","2025-03-01T12:00:00Z","unique-identifier"
```

For examples, see the template file in the parent directory: `articles-sample.csv.template`