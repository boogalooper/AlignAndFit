/*
<javascriptresource>
<category>jazzy</category>
<enableinfo>true</enableinfo>
</javascriptresource>
*/

#target photoshop

var isCancelled = false;
activeDocument.suspendHistory('Align and fit subject', 'main()')

function main() {
    try {
        var lr = new AM('layer'),
            previousLayer = new AM('layer', 'backwardEnum'),
            doc = new AM('document');

        lr.autoCutout();

        if (doc.hasProperty('selection')) {
            var subject = doc.descToObject(doc.getProperty('selection'))
            lr.deselect()
            with (subject) {
                subject.width = right - left
                subject.height = bottom - top
                subject.center = { y: top + height / 2, x: left + width / 2 }
                subject.vertical = bottom - top > right - left
            }

            var offset = doc.descToObject(lr.getProperty('boundsNoEffects'))
            with (offset) {
                top = subject.top - top
                left = subject.left - left
                bottom = bottom - subject.bottom
                right = right - subject.right
            }
            subject.offset = offset

            doc.makeSelection(previousLayer.getProperty('layerID'))
            doc.setQuickMask(true)
            doc.levels([128, 1, 240])
            doc.setQuickMask()
            doc.createPath()
            doc.makeSelectionFromPath()
            doc.deleteCurrentPath()

            var frame = doc.descToObject(doc.getProperty('selection'))
            doc.deselect()

            with (frame) {
                frame.height = bottom - top
                frame.width = right - left
                frame.center = { y: top + height / 2, x: left + width / 2 }
                frame.vertical = bottom - top > right - left
            }

            if (!lr.getProperty('group')) lr.groupCurrentLayer()

            var dH = frame.center.x - subject.center.x,
                dV = frame.center.y - subject.center.y,
                border = subject.offset.right < subject.offset.left ? subject.offset.right : subject.offset.left,
                scale = frame.width / (border * 2 + subject.width) * 100;

            lr.transform(dH, dV, scale, subject.center.x, subject.center.y, subject)
            if (subject.height > frame.height) {
                var ratioTop = frame.height * (frame.vertical ? 0.1 : 0.05);
                ratioTop = ratioTop < subject.offset.top ? ratioTop : subject.offset.top
                lr.move(0, frame.top - subject.top + ratioTop, subject)
            } else {
                var ratioTop = frame.height * (frame.vertical ? 0.1 : 0.1),
                    ratioBottom = frame.height * (frame.vertical ? 0.1 : 0.05);

                ratioTop = ratioTop < subject.offset.top ? ratioTop : subject.offset.top
                ratioBottom = ratioBottom > subject.offset.bottom ? subject.offset.bottom : ratioBottom

                lr.move(0, frame.top - subject.top + ratioTop, subject)
                if (subject.bottom < frame.bottom) {
                    lr.transform(0, 0, (frame.bottom - subject.top) / (subject.bottom + ratioBottom - subject.top) * 100, frame.center.x, subject.top, subject)
                }
            }

            var visibleFrame = doc.descToObject(previousLayer.getProperty('boundsNoEffects'))
            var scale = []
            if (visibleFrame.bottom > subject.bottom + subject.offset.bottom) scale.push((visibleFrame.bottom - frame.center.y) / (subject.bottom + subject.offset.bottom - frame.center.y) * 100)
            if (visibleFrame.top < subject.top - subject.offset.top) scale.push((frame.center.y - visibleFrame.top) / (frame.center.y - (subject.top - subject.offset.top)) * 100)
            if (visibleFrame.right > subject.right + subject.offset.right) scale.push((visibleFrame.right - frame.center.x) / (subject.right + subject.offset.right - frame.center.x) * 100)
            if (visibleFrame.left < subject.left - subject.offset.left) scale.push((frame.center.x - visibleFrame.left) / (frame.center.x - (subject.left - subject.offset.left)) * 100)

            if (scale.length) {
                scale.sort(sort)
                lr.transform(0, 0, scale[0], frame.center.x, frame.center.y, subject)
            }
        }
    } catch (e) { $.writeln(e); isCancelled = true }
}

function sort(a, b) { return a < b ? 1 : -1 }

function AM(target, order) {
    var s2t = stringIDToTypeID,
        t2s = typeIDToStringID;

    target = s2t(target)
    this.getProperty = function (property, descMode, id, idxMode, parent, parentIdx) {
        property = s2t(property);
        (r = new ActionReference()).putProperty(s2t('property'), property);
        id != undefined ? (idxMode ? r.putIndex(target, id) : r.putIdentifier(target, id)) :
            r.putEnumerated(target, s2t('ordinal'), order ? s2t(order) : s2t('targetEnum'));
        if (parent) r.putIndex(s2t(parent), parentIdx);
        return descMode ? executeActionGet(r) : getDescValue(executeActionGet(r), property)
    }

    this.hasProperty = function (property, id, idxMode) {
        property = s2t(property);
        (r = new ActionReference()).putProperty(s2t('property'), property);
        id ? (idxMode ? r.putIndex(target, id) : r.putIdentifier(target, id))
            : r.putEnumerated(target, s2t('ordinal'), order ? s2t(order) : s2t('targetEnum'));
        return executeActionGet(r).hasKey(property)
    }

    this.descToObject = function (d) {
        var o = {}
        for (var i = 0; i < d.count; i++) {
            var k = d.getKey(i)
            o[t2s(k)] = getDescValue(d, k)
        }
        return o
    }

    this.setQuickMask = function (mode) {
        (r = new ActionReference()).putProperty(s2t("property"), s2t("quickMask"));
        r.putEnumerated(s2t("document"), s2t("ordinal"), s2t("targetEnum"));
        (d = new ActionDescriptor()).putReference(s2t("null"), r);
        executeAction(mode ? s2t("set") : s2t('clearEvent'), d, DialogModes.NO);
    }

    this.levels = function (paramsArray) {
        var left = paramsArray[0],
            gamma = paramsArray[1],
            right = paramsArray[2];

        (d = new ActionDescriptor()).putEnumerated(s2t('presetKind'), s2t('presetKindType'), s2t('presetKindCustom'));
        (r = new ActionReference()).putEnumerated(s2t('channel'), s2t('ordinal'), s2t('targetEnum'));
        (d1 = new ActionDescriptor()).putReference(s2t('channel'), r);
        (l = new ActionList()).putInteger(left);
        l.putInteger(right);
        d1.putList(s2t('input'), l);
        d1.putDouble(s2t('gamma'), gamma);
        (l1 = new ActionList()).putObject(s2t('levelsAdjustment'), d1);
        d.putList(s2t('adjustment'), l1);
        executeAction(s2t('levels'), d, DialogModes.NO)
    }

    this.deselect = function () {
        (r = new ActionReference()).putProperty(s2t('channel'), s2t('selection'));
        (d = new ActionDescriptor()).putReference(s2t('null'), r);
        d.putEnumerated(s2t('to'), s2t('ordinal'), s2t('none'));
        executeAction(s2t('set'), d, DialogModes.NO);
    }

    this.autoCutout = function (sampleAllLayers) {
        sampleAllLayers = sampleAllLayers == undefined ? false : true;
        (d = new ActionDescriptor()).putBoolean(s2t('sampleAllLayers'), sampleAllLayers);
        executeAction(s2t('autoCutout'), d, DialogModes.NO);
    }

    this.groupCurrentLayer = function () {
        (r = new ActionReference()).putEnumerated(s2t('layer'), s2t('ordinal'), s2t('targetEnum'));
        (d = new ActionDescriptor()).putReference(s2t('null'), r);
        executeAction(s2t('groupEvent'), d, DialogModes.NO);
    }

    this.transform = function (dX, dY, scale, x, y, subject) {
        (r = new ActionReference()).putEnumerated(s2t('layer'), s2t('ordinal'), s2t('targetEnum'));
        (d = new ActionDescriptor()).putReference(s2t('null'), r);
        d.putEnumerated(s2t('freeTransformCenterState'), s2t('quadCenterState'), s2t('QCSIndependent'));
        ((d1 = new ActionDescriptor())).putUnitDouble(s2t('horizontal'), s2t('pixelsUnit'), x);
        d1.putUnitDouble(s2t('vertical'), s2t('pixelsUnit'), y);
        d.putObject(s2t('position'), s2t('paint'), d1);
        (d2 = new ActionDescriptor()).putUnitDouble(s2t('horizontal'), s2t('pixelsUnit'), dX);
        d2.putUnitDouble(s2t('vertical'), s2t('pixelsUnit'), dY);
        d.putObject(s2t('offset'), s2t('offset'), d2);
        d.putUnitDouble(s2t('width'), s2t('percentUnit'), scale);
        d.putUnitDouble(s2t('height'), s2t('percentUnit'), scale);
        d.putEnumerated(s2t('interfaceIconFrameDimmed'), s2t('interpolationType'), s2t('bicubic'));
        executeAction(s2t('transform'), d, DialogModes.NO);

        if (subject) {
            with (subject) {
                var dV = (height * scale / 100 - (bottom - top)),
                    dH = (width * scale / 100 - (right - left));
                top = top - (dV * (y - top) / height) + dY
                bottom = bottom + (dV * (bottom - y) / height) + dY
                left = left - (dH * (x - left) / width) + dX
                right = right + (dH * (right - x) / width) + dX
                center.x += dX
                center.y += dY
                height = height * scale / 100
                width = width * scale / 100
            }

            with (subject.offset) {
                top = top * scale / 100
                left = left * scale / 100
                bottom = bottom * scale / 100
                right = right * scale / 100
                height = height * scale / 100
                width = width * scale / 100
            }
        }
    }

    this.move = function (dX, dY, subject) {
        (r = new ActionReference()).putEnumerated(s2t('layer'), s2t('ordinal'), s2t('targetEnum'));
        (d = new ActionDescriptor()).putReference(s2t('null'), r);
        (d1 = new ActionDescriptor()).putUnitDouble(s2t('horizontal'), s2t('pixelsUnit'), dX);
        d1.putUnitDouble(s2t('vertical'), s2t('pixelsUnit'), dY);
        d.putObject(s2t('to'), s2t('offset'), d1);
        executeAction(s2t('move'), d, DialogModes.NO);

        with (subject) {
            center.x += dX
            center.y += dY
            top += dY
            bottom += dY
            left += dX
            right += dX
        }
    }

    this.makeSelection = function (id) {
        (r = new ActionReference()).putProperty(s2t('channel'), s2t('selection'));
        (d = new ActionDescriptor()).putReference(s2t('null'), r);
        (r1 = new ActionReference()).putEnumerated(s2t('channel'), s2t('channel'), s2t('transparencyEnum'));
        r1.putIdentifier(s2t('layer'), id);
        d.putReference(s2t('to'), r1);
        executeAction(s2t('set'), d, DialogModes.NO);
    }

    this.makeSelectionFromPath = function () {
        (r = new ActionReference()).putProperty(s2t("channel"), s2t("selection"));
        (d = new ActionDescriptor()).putReference(s2t("null"), r);
        (r1 = new ActionReference()).putProperty(s2t("path"), s2t("workPath"));
        d.putReference(s2t("to"), r1);
        d.putBoolean(s2t("vectorMaskParams"), true);
        executeAction(s2t("set"), d, DialogModes.NO);
    }

    this.deleteCurrentPath = function () {
        (r = new ActionReference()).putProperty(s2t('path'), s2t('workPath'));
        (d = new ActionDescriptor()).putReference(s2t('null'), r);
        executeAction(s2t('delete'), d, DialogModes.NO);
    }

    this.createPath = function (tolerance) {
        tolerance = tolerance ? tolerance : 10;
        (r = new ActionReference()).putClass(s2t('path'));
        (d = new ActionDescriptor()).putReference(s2t('null'), r);
        (r1 = new ActionReference()).putProperty(s2t('selectionClass'), s2t('selection'));
        d.putReference(s2t('from'), r1);
        d.putUnitDouble(s2t('tolerance'), s2t('pixelsUnit'), tolerance);
        executeAction(s2t('make'), d, DialogModes.NO);
    }

    function getDescValue(d, p) {
        switch (d.getType(p)) {
            case DescValueType.OBJECTTYPE: return (d.getObjectValue(p));
            case DescValueType.LISTTYPE: return d.getList(p);
            case DescValueType.REFERENCETYPE: return d.getReference(p);
            case DescValueType.BOOLEANTYPE: return d.getBoolean(p);
            case DescValueType.STRINGTYPE: return d.getString(p);
            case DescValueType.INTEGERTYPE: return d.getInteger(p);
            case DescValueType.LARGEINTEGERTYPE: return d.getLargeInteger(p);
            case DescValueType.DOUBLETYPE: return d.getDouble(p);
            case DescValueType.ALIASTYPE: return d.getPath(p);
            case DescValueType.CLASSTYPE: return d.getClass(p);
            case DescValueType.UNITDOUBLE: return (d.getUnitDoubleValue(p));
            case DescValueType.ENUMERATEDTYPE: return [t2s(d.getEnumerationType(p)), t2s(d.getEnumerationValue(p))];
            default: break;
        };
    }
}

function selection(s) {
    var idsetd = charIDToTypeID("setd");
    var desc186 = new ActionDescriptor();
    var idnull = charIDToTypeID("null");
    var ref2 = new ActionReference();
    var idChnl = charIDToTypeID("Chnl");
    var idfsel = charIDToTypeID("fsel");
    ref2.putProperty(idChnl, idfsel);
    desc186.putReference(idnull, ref2);
    var idT = charIDToTypeID("T   ");
    var desc187 = new ActionDescriptor();
    var idTop = charIDToTypeID("Top ");
    var idPxl = charIDToTypeID("#Pxl");
    desc187.putUnitDouble(idTop, idPxl, s.top);
    var idLeft = charIDToTypeID("Left");
    var idPxl = charIDToTypeID("#Pxl");
    desc187.putUnitDouble(idLeft, idPxl, s.left);
    var idBtom = charIDToTypeID("Btom");
    var idPxl = charIDToTypeID("#Pxl");
    desc187.putUnitDouble(idBtom, idPxl, s.bottom);
    var idRght = charIDToTypeID("Rght");
    var idPxl = charIDToTypeID("#Pxl");
    desc187.putUnitDouble(idRght, idPxl, s.right);
    var idRctn = charIDToTypeID("Rctn");
    desc186.putObject(idT, idRctn, desc187);
    executeAction(idsetd, desc186, DialogModes.NO);
}