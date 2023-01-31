import { Cluster } from 'puppeteer-cluster'
import { CSVHandler, getRows, getRowsCSV, delay } from './utils.js'





(async () => {
    const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        maxConcurrency: 8,
        timeout: 2147483647
    });

    await cluster.task(async ({ page, data: { threadId, start, count }, worker }) => {

        const rows = await getRows(start, count)



        login: while (true) {

            try {
                await page.goto('https://core.duvalclerk.com/');

                await page.click('#NavBar1_c_RecordsLoginItem > td')

                // Type login info.


                await page.type('#c_UsernameTextBox', 'mrosenberg@roiglawyers.com');
                await page.type('#c_PasswordTextBox', 'Roig1255!');


                await page.click('#LoginDialog > tbody > tr:nth-child(4) > td:nth-child(2) > input[type=submit]')


                await delay(3000);

                await page.waitForSelector('#c_AccessTypeLabel', { timeout: 5000 })
                const loginStatus = await page.$('#c_AccessTypeLabel')

                const loginStatusText = await (await loginStatus.getProperty('textContent')).jsonValue()
                if (!loginStatusText.includes('Public Access')) {
                    continue login
                }

                console.log('Login successfull')
                break
            } catch (error) {
                console.log(`login failed on thread ${threadId}`)
                continue login
            }

        }
        await page.waitForSelector('#c_NavBarContainer > div:nth-child(2) > table > tbody > tr:nth-child(8) > td', { timeout: 10000 })
        for (let row of tqdm(rows)) {
      
          try {
            await page.goto('https://core.duvalclerk.com/CoreCms.aspx')
            await page.waitForSelector('#ContentPlaceHolder1_WebTab1 > div > div:nth-child(3) > div > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(1) > input', { timeout: 10000 })
            await page.type('#ContentPlaceHolder1_WebTab1 > div > div:nth-child(3) > div > table:nth-child(1) > tbody > tr:nth-child(3) > td:nth-child(1) > input', row['CaseSequenceNumber'])
            await page.waitForSelector('#ContentPlaceHolder1_WebTab1 > div > div:nth-child(3) > div > table:nth-child(1) > tbody > tr:nth-child(4) > td > input[type=button]', { timeout: 5000 })
            await page.click('#ContentPlaceHolder1_WebTab1 > div > div:nth-child(3) > div > table:nth-child(1) > tbody > tr:nth-child(4) > td > input[type=button]')
            await page.waitForSelector('#ContentPlaceHolder1_WebTab1 > div > div:nth-child(4) > div > div.caseDisplayTable.caseSummary > table > tbody > tr:nth-child(2) > td:nth-child(2)', { timeout: 10000 })
            const caseElt = await page.$('#ContentPlaceHolder1_WebTab1 > div > div:nth-child(4) > div > div.caseDisplayTable.caseSummary > table > tbody > tr:nth-child(2) > td:nth-child(2)')
            const caseStatus = await (await caseElt.getProperty('textContent')).jsonValue()
      
            if (caseStatus.trim().toUpperCase() != row['Status'].toUpperCase()) {
              output.push([row['MatterID'], row['CaseSequenceNumber'], caseStatus, 'N/A'])
            }
          }
          catch {
      
            output.push([row['MatterID'], row['CaseSequenceNumber'], '', 'CaseSequenceNumber not found on website'])
          }
      
        }

        return new Promise((resolve, reject) => {
            console.log(`Thread ${threadId} done`)
            resolve('done')
        })
    });

    cluster.queue({ threadId: 1, start: 1, count: 10 });
    cluster.queue({ threadId: 2, start: 11, count: 10 });
    cluster.queue({ threadId: 3, start: 21, count: 10 });
    cluster.queue({ threadId: 4, start: 31, count: 10 });


    await cluster.idle();
    await cluster.close();
    console.log('Done')
    await CSVHandler.WriteCSV(output, 'results.csv')
})();