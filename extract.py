#!/usr/bin/env python3
# This python script extracts data from a simple tabs separated file, like the result from copying a google docs sheet into a text file.
# It will put each leg in the subfolder "lege"

import os.path
from fileinput import input

def strn(s):
    return s
    return '"'+s+'"'

jsonlist = []
for line in input():
    line = line.replace(" ", " ")

    items = [item.strip() for item in line.split("	")]
    while len(items) < 12:
        items.append("null")

    filename = items[0].lower().replace(" ", "_").replace("/", "|") + ".leg"
    filename = os.path.join("lege", filename)

    taglist = (strn(tag.strip()) for tag in items[5].split(","))
    tags = ",".join(taglist)

    tags = items[5]

    result = ["name: " + strn(items[0]),
              "teaser: " + strn(items[1]),
              "inside: " + ("true" if items[3] == "Yes" else "false"),
              "youtube: " + ("" if items[4] == "" else strn("youtube.com/watch?v=" + items[4])),
              "tags: " + items[5],
              "min_age: " + items[6],
              "max_age: " + items[7],
              "min_time: " + items[8],
              "max_time: " + items[9],
              "min_participants: " + items[10],
              "max_participants: " + items[11],
              "description: " + strn(items[2])
    ]
    json = "  {\n" + ",\n".join("    "+r for r in result) + "\n  }"
    # jsonlist.append(json)
    content = "\n".join(result)
    with open(filename, "w") as file:
        file.write(content)
    # print(content + "\n")

# print("",\n".join(jsonlist))
