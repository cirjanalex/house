import base64
import hashlib
import io
import json
import math
from pathlib import Path
import re
from urllib.parse import urlsplit

from geometry import box, number, positive, require, vector


def resource(record, root):
    path = (root / record["file"]).resolve()
    require(path.is_relative_to(root.resolve()), "Asset must live under its layer directory")
    require(path.stat().st_size <= 16 << 20, "Asset exceeds 16 MiB")
    data = path.read_bytes()
    require(hashlib.sha256(data).hexdigest() == record["sha256"], f"Asset hash mismatch: {path.name}")
    source = urlsplit(record["source"])
    require(source.scheme == "https" and source.hostname, "Provide an HTTPS asset source")
    require(record["license"] in ("CC0-1.0", "CC-BY-4.0"), "Unsupported redistribution license")
    credit = {k: record[k] for k in ("source", "license")}
    if record["license"] == "CC-BY-4.0":
        require(record.get("author") and record.get("title"), "Attribution needs author and title")
        credit.update(author=record["author"], title=record["title"])
    return data, credit


def materials(layer, root, slots):
    styles, credits = {}, []
    for key, entry in layer.items():
        require(key in slots, f"Material slot not used by shell: {key}")
        require(re.fullmatch(r"#[0-9a-fA-F]{6}", entry["color"]), f"Invalid color for {key}")
        style = {"color": entry["color"]}
        if "texture" in entry:
            from PIL import Image
            data, credit = resource(entry["texture"], root)
            with Image.open(io.BytesIO(data)) as im:
                require(im.format in ("JPEG", "PNG") and max(im.size) <= 4096, "Use JPEG/PNG up to 4K")
                mime = Image.MIME[im.format]
                im.verify()
            strength = number(entry.get("texture_strength", 1))
            require(0 <= strength <= 1, "Texture strength must be between 0 and 1")
            if strength < 1:
                with Image.open(io.BytesIO(data)) as im:
                    rgb = im.convert("RGB")
                    toned = Image.blend(Image.new("RGB", rgb.size, "white"), rgb, strength)
                    with io.BytesIO() as buffer:
                        toned.save(buffer, format="JPEG", quality=90)
                        data, mime = buffer.getvalue(), "image/jpeg"
            style.update(map=f"data:{mime};base64," + base64.b64encode(data).decode(),
                         tile=positive(entry["tile_m"]))
            credits.append(credit)
        styles[key] = style
    return styles, credits


def obj_mesh(data, size):
    verts, triangles = [], []
    for line in data.decode("utf-8-sig").splitlines():
        cols = line.partition("#")[0].split()
        if not cols:
            continue
        if cols[0] == "v":
            verts.append(vector([float(x) for x in cols[1:4]], 3))
        elif cols[0] == "f":
            ids = []
            for token in cols[1:]:
                i = int(token.split("/")[0])
                require(i != 0 and -len(verts) <= i <= len(verts), "Invalid OBJ vertex index")
                ids.append(i-1 if i > 0 else len(verts)+i)
            require(len(ids) in (3, 4), "Triangulate OBJ faces before import")
            triangles.extend(ids[:3])
            if len(ids) == 4:
                triangles.extend([ids[0], ids[2], ids[3]])
    require(verts and triangles, "OBJ has no faces")
    bounds = [(min(a), max(a)) for a in zip(*verts)]
    require(all(b > a for a, b in bounds), "Furniture OBJ must be three-dimensional")
    coords = [[((p[i]-a)/(b-a)-(0 if i == 1 else .5))*size[i]
               for i, (a, b) in enumerate(bounds)] for p in verts]
    return coords, triangles


def proxy_parts(kind, size, place, finish):
    """Original massing, in fractions of the overall envelope. Front faces local -Z."""
    w, h, d = size
    wood, white, dark = "f_pine", "f_white", "f_ink"

    def p(x,y,z,a,b,c,mat,r=0):
        place(x*w,y*h,z*d,a*w,b*h,c*d,mat,r)

    def legs(top, mat, thickness=.065):
        for i in (-1,1):
            for j in (-1,1):
                p(i*(.48-thickness/2),top/2,j*(.48-thickness/2),thickness,top,thickness,mat)

    if kind in ("table","side_table","workbench","desk"):
        top = {"side_table":.12,"workbench":.05}.get(kind,.045)
        p(0,1-top/2,0,1,top,1,finish or (wood if kind=="workbench" else white if kind in ("side_table","desk") else dark),.009)
        legs(1-top,white if kind in ("side_table","desk") else dark,.12 if kind=="side_table" else .055)
        if kind=="desk":
            p(-.475,.48,0,.05,.96,.96,white)
            p(.01,.90,-.022,.92,.105,.945,white)
        elif kind=="workbench":
            for y in (.16,.54): p(0,y,0,.93,.035,.91,dark)
    elif kind=="chair":
        legs(.55,dark)
        p(0,.565,-.085,1,.04,.83,dark,.045)
        for x in (-.43,.43): p(x,.74,.43,.06,.52,.06,dark)
        p(0,.885,.44,1,.23,.12,dark,.02)
    elif kind=="sofa":
        legs(.18,dark)
        p(0,.34,0,1,.35,1,"f_moss",.055)
        p(0,.75,.405,1,.50,.19,"f_moss",.055)
        for x in (-.45,.45): p(x,.67,-.08,.1,.34,.84,"f_moss",.04)
        for x in (-.20,.20): p(x,.577,-.085,.394,.14,.81,"f_sage",.042)
    elif kind=="armchair":
        for x in (-.455,.455):
            p(x,.022,0,.09,.044,1,wood,.016)
            p(x,.29,-.40,.09,.54,.07,wood,.016)
            p(x,.55,-.03,.09,.045,.80,wood,.015)
        p(0,.375,-.06,.87,.09,.82,"f_linen",.055)
        p(0,.69,.32,.86,.54,.15,"f_linen",.052)
        p(0,.955,.345,.84,.09,.18,"f_linen",.045)
    elif kind=="bed":
        legs(.38,wood,.055)
        p(0,.405,0,1,.19,1,wood)
        p(0,.72,.48,1,.56,.04,wood,.01)
        p(0,.555,-.017,.96,.20,.925,"f_linen",.045)
        p(0,.673,-.17,.966,.05,.62,finish or "f_sage",.028)
        pillows=2 if w>1.3 else 1
        for i in range(pillows):
            p((i+.5)/pillows-.5,.709,.292,.8/pillows,.105,.155,"f_linen",.035)
    elif kind in ("cubby","wardrobe"):
        mat=white if kind=="cubby" else wood
        for x in (-.48,.48): p(x,.5,0,.04,1,1,mat)
        for y in (.02,.98): p(0,y,0,.92,.04,1,mat)
        p(0,.5,0,.024,.92,1,mat)
        if kind=="cubby":
            p(0,.5,0,.92,.024,1,mat)
        else:
            p(.235,.86,0,.44,.024,.05,"f_metal")
            for y in (.31,.61): p(-.236,y,0,.445,.024,.9,mat)
            for i in range(10): p(-.44+i*.044,.51,-.47,.028,.85,.035,mat)
    elif kind in ("rack","bath_rack"):
        mat="f_metal" if kind=="rack" else white
        legs(1,mat,.045 if kind=="rack" else .07)
        shelves=(.09,.52,.965) if kind=="rack" else (.08,.38,.68,.985)
        for y in shelves:
            p(0,y,0,1,.03,1,mat,.01)
            if kind=="rack":
                for x in (-.35,-.175,0,.175,.35): p(x,y+.017,0,.012,.008,.94,"f_silver")
    elif kind in ("prep_base","sink_base","blind_sink_base","cooker","fridge"):
        # A sink envelope includes its tap; its counter aligns with the neighbouring base.
        sink=kind in ("sink_base","blind_sink_base")
        top=.765 if sink else 1
        body=top-(.08 if sink else .025)
        if kind=="blind_sink_base":
            # Local -X meets the perpendicular cooker. No pull or operable leaf on the fixed return.
            p(0,.05,.025,.94,.10,.85,dark)
            base, soffit=.10,top-.034
            bay=.70/3
            for x in (-.486,-.20,-.20+bay,-.20+2*bay,.486):
                p(x,(base+soffit)/2,.0325,.008,soffit-base,.915,white)
            p(0,base+.008,.0325,.98,.016,.915,white)
            p(0,(base+soffit)/2,.478,.98,soffit-base,.024,white)
            p(0,soffit-.016,-.40,.98,.032,.05,white)
            p(-.35,top*.51,-.445,.292,top*.80,.030,wood)
            for i in range(3):
                cx=-.20+(i+.5)*bay
                p(cx,top*.51,-.445,bay-.004,top*.80,.030,white,.003)
                p(cx+bay*.28,top*.82,-.480,bay*.24,.022,.040,"f_metal")
        else:
            p(0,.05,0,.94,.10,.9,dark)
            p(0,(body+.075)/2,.01,.98,body-.075,.96,white)
            panels={"prep_base":3,"sink_base":2}.get(kind,1)
            for i in range(panels):
                cx=(i+.5)/panels-.5
                p(cx,top*.51,-.475,.966/panels,top*.80,.045,white,.006)
                p(cx,top*.83,-.495,.24/panels,.022,.01,"f_metal")
        if kind=="prep_base":
            p(1/3,.74,-.499,.313,.007,.002,dark)
        if sink:
            # Recessed bowl: solid worktop strips surround a lower metal basin.
            rim=top-.017
            for x,a in ((-.36,.28),(.275,.45)): p(x,rim,0,a,.034,1,wood)
            for z,c in ((-.415,.17),(.4125,.175)): p(-.085,rim,z,.27,.034,c,wood)
            p(-.085,top-.036,0,.27,.018,.66,"f_silver")
            p(-.085,.865,.365,.017,.24,.055,"f_metal")
            p(-.085,.99,.24,.017,.02,.30,"f_metal")
        elif kind=="cooker":
            # Reserve the last 0.6% of the envelope for raised zones, seated on the hob.
            p(0,.975,0,1,.038,1,dark,.008)
            for x in (-.225,.225):
                for z in (-.235,.235): p(x,.997,z,.34,.006,.34,"f_metal",min(w,d)*.165)
            p(0,.47,-.499,.77,.45,.002,dark)
        elif kind=="fridge":
            p(0,.31,-.499,.97,.009,.002,"f_metal")
            p(0,.988,0,1,.024,1,white,.012)
        else:
            p(0,.98,0,1,.04,1,wood,.008)
    elif kind=="bench":
        legs(.90,wood,.09)
        for i in range(5): p(0,.95,(i-2)*.205,1,.10,.18,wood,.012)
    else:
        raise ValueError(f"Unknown furniture kind: {kind}")


def furniture(layer, brief, root, shell_hash, level_count):
    require(brief.get("approved") is True and brief.get("geometry_sha256") == shell_hash,
            "Furniture requires a user's approval of this exact shell")
    require(any(isinstance(brief.get(k), str) and brief[k].strip() for k in ("retailer", "style")),
            "Furniture brief must specify a retailer or style")
    require(layer["geometry_sha256"] == shell_hash, "Stale furniture placements")
    groups, credits, catalog = [], [], {}
    if "catalog" in layer:
        path=(root/layer["catalog"]).resolve()
        require(path.is_relative_to(root.resolve()), "Catalog must live under its layer directory")
        catalog=json.loads(path.read_text(encoding="utf-8-sig"))["entries"]
    for location in layer["items"]:
        ref=location.get("ref")
        if ref is not None:
            spec=catalog[ref]
            require(not (location.keys() & spec.keys()), "Placement cannot override catalog specifications")
            item={**spec, **location}
        else:
            item=location
        w, h, d = vector(item["size"], 3)
        require(all(n > 0 for n in (w, h, d)), "Invalid furniture dimensions")
        x, y, z = vector(item["at"], 3)
        yaw = number(item.get("yaw", 0))
        level = item["level"]
        require(type(level) is int and 0 <= level < level_count, "Invalid furniture level")
        parts = []
        angle = math.radians(yaw)

        def part(cx, cy, cz, width, height, depth, mat, radius=0):
            shape=box([x+cx*math.cos(angle)+cz*math.sin(angle), y+cy,
                       z+cz*math.cos(angle)-cx*math.sin(angle)], [width, height, depth], mat, yaw)
            if radius:
                shape["corner_radius"]=min(radius,width/2,depth/2)
            parts.append(shape)

        kind = item["kind"]
        if kind == "obj":
            data, credit = resource(item["asset"], root)
            verts, indices = obj_mesh(data, [w, h, d])
            parts.append({"mesh": verts, "indices": indices, "at": [x,y,z], "yaw": yaw, "slot": "timber"})
            credits.append(credit)
        else:
            proxy_parts(kind,(w,h,d),part,item.get("finish"))
        label = item["name"] + (" · dimensional PROXY" if kind != "obj" else "")
        group = {"name": label, "level": level, "furniture": True, "parts": parts, "size":[w,h,d]}
        for key in ("room","use","sku","note"):
            if key in item: group[key]=item[key]
        if "product" in item:
            url = urlsplit(item["product"])
            require(url.scheme == "https" and url.hostname, "Invalid product reference")
            group["product"] = item["product"]
        groups.append(group)
    return groups, credits
