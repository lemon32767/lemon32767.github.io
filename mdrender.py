#!/bin/env python

#import markdown as md
import sys, re, html, subprocess

template = \
"""\
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"> 
    <title>%s</title>
    <link rel="stylesheet" href="./style.css">
    <link rel="stylesheet" href="./hljsdefault.min.css">
    <script src="./hljs.min.js"></script>
    <script>hljs.highlightAll();</script>
</head>
<body>
"""

filename = sys.argv[1]
outfname = sys.argv[2] if len(sys.argv) > 2 else re.sub('(\\.md)?$', '.html', filename, re.T)

with open(filename) as inf:
    output = subprocess.check_output(['cmark-gfm', '-e', 'table', '--unsafe'],
                                     stdin=inf).decode('UTF-8')
    with open(outfname, 'w') as outf:
        inf.seek(0)
        text = '\n'.join(inf.readlines())
        tmatches = re.findall('^\\s*#\\s*(.*)\\n', text)
        title = tmatches[0] #+ " — lemon's page" if len(tmatches) > 0 else "lemon's page"

        outf.write(template % html.escape(title))
        outf.write(output)
        outf.write("</body></html>")
