import fs from 'fs'
import { parse } from 'csv-parse'
import sql from 'mssql/msnodesqlv8.js'



class CSVHandler {

    static async ReadCSV(filePath) {

        return new Promise((resolve, reject) => {
            const output = [];
            fs.createReadStream(filePath)
                .pipe(parse({ columns: false, delimiter: ',', trim: true, skip_empty_lines: true }))
                .on('readable', function () {
                    let record
                    while (record = this.read()) {
                        output.push(record)
                    }
                })
                .on('end', function () {
                    resolve(output);
                })
        });
    }
    static async WriteCSV(dataToWrite, filename = 'results.csv') {

        const csv = dataToWrite.map(row => row.join(','))
        fs.writeFile(filename, csv.join("\r\n"), 'utf8', function (err) {
            if (err) {
                console.log('Some error occured - file either not saved or corrupted file saved.');
            } else {
                console.log(`${filename} was saved!`);
            }
        });
    }
}


async function getRows(start = null, count = null) {
    // db config
    var config = {
        database: 'ProLaw',
        server: 'RoigSRV8',
        driver: 'msnodesqlv8',
        options: {
            trustedConnection: true
        }
    }

    if (start == null || count == null) {
        var query = `SELECT M.MatterID, M.Status, dbo.F_SELECT_CaseNumberFormatted(Q.QCaseNo1, Q.QCounty) as [CaseSequenceNumber] FROM Matters M INNER JOIN MattersQPleadingInfo Q ON M.Matters = Q.Matters and Q.QCounty = 'Duval' and M.Status = 'Open' ORDER BY M.MatterID;`
    } else {
        var query = `SELECT M.MatterID, M.Status, dbo.F_SELECT_CaseNumberFormatted(Q.QCaseNo1, Q.QCounty) as [CaseSequenceNumber] FROM Matters M INNER JOIN MattersQPleadingInfo Q ON M.Matters = Q.Matters and Q.QCounty = 'Duval' and M.Status = 'Open' ORDER BY M.MatterID OFFSET ${start} ROWS FETCH NEXT ${count} ROWS ONLY;`
    }

    // connect to db
    await sql.connect(config)
    // retrieve data from db
    var request = new sql.Request();
    var results = await request.query(query)

    return results.recordset
}

async function getRowsCSV(start = null, count = null, filename = 'data.csv') {

    const rows = await CSVHandler.ReadCSV(filename)
    if (start == null || count == null) {
        return rows
    } else {
        return rows.slice(start, start + count)
    }
}


function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
}

export { CSVHandler, getRowsCSV, getRows, delay }