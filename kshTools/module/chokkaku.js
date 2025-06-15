import { parseKSH, stringifyKSH, getPeriod, updatePeriod } from './kshParserModule.js';
const laserPointList = ["0", "1", "8", "9", ]// 後で正規表現になおす

function laserLength(kshObject) {
    let prevPoint = {
        "time": {
            "l":0, "r":0
        },
        "point": {
            "l":"-", "r":"-"
        }
    };

    for (let barNumber = 1; barNumber <= kshObject.measures.length; barNumber++) {
		const measure = getPeriod(kshObject, barNumber);
		const beat = parseFloat(measure.beat.split('/')[0])/ parseFloat(measure.beat.split('/')[1]);
		const unitSize = beat / measure.main.length;

		for (let unit = 0; unit < measure.main.length; unit++) {
            for (const lr of ["l", "r"]) {
                if (laserPointList.include(measure.main[unit].notes.laser[lr])) {
                    const currentTime = unitSize * unit;
                    measure.main[unit].notes.laser.history[lr].time = currentTime - prevPoint.time[lr];
                    measure.main[unit].notes.laser.history[lr].point = prevPoint.point[lr];
                    prevPoint[lr].time = currentTime;
                    prevPoint[lr].point = measure.main[unit].notes.laser[lr];
			    }
            }
	    }
        prevPoint.l.time
    }
}

function chokkakuCheck(kshObject) {
	let prevPoint_L = 0;
	let prevPoint_R = 0;
	const chokkakuLimit = 0.03125; // 1/32
	for (let barNumber = 1; barNumber <= kshObject.measures.length; barNumber++) {
		const measure = getPeriod(kshObject, barNumber);
		const beat = parseFloat(measure.beat.split('/')[0])/ parseFloat(measure.beat.split('/')[1]);
		const unitSize = beat / measure.main.length;
		for (let unit = 0; unit < measure.main.length; unit++) {
			if (laserPointList.include(measure.main[unit].notes.laser.l)) {
				const currentPoint_L = unitSize * unit;
			}
	    }
    }
}