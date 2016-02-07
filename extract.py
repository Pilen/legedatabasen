#!/usr/bin/env python3
# This python script extracts data from a simple tabs separated file, like the result from copying a google docs sheet into a text file.
# It will put each leg in the subfolder "lege"

import csv
import sys
import os.path
from fileinput import input

def strn(s):
    return s
    return '"'+s+'"'

if len(sys.argv) != 2:
    raise Exception("Wrong number of arguments")
with open(sys.argv[1]) as csv_file:
    csv_file_content = csv_file.read().replace(" ", " ").split("\n")

reader = csv.reader(csv_file_content)

for row in reader:
    while len(row) < 12:
        row.append("null")

    filename = row[0].lower().replace(" ", "_").replace("/", "|") + ".leg"
    filename = os.path.join("lege", filename)

    taglist = (strn(tag.strip()) for tag in row[5].split(","))
    tags = ",".join(taglist)

    tags = row[5]

    result = ["name: " + strn(row[0]),
              "teaser: " + strn(row[1]),
              "inside: " + ("true" if row[3] == "Yes" else "false"),
              "youtube: " + ("" if row[4] == "" else strn("youtube.com/watch?v=" + row[4])),
              "tags: " + row[5],
              "min_age: " + row[6],
              "max_age: " + row[7],
              "min_time: " + row[8],
              "max_time: " + row[9],
              "min_participants: " + row[10],
              "max_participants: " + row[11],
              "description: " + strn(row[2])
    ]
    # json = "  {\n" + ",\n".join("    "+r for r in result) + "\n  }"
    content = "\n".join(result)
    with open(filename, "w") as file:
        file.write(content)
