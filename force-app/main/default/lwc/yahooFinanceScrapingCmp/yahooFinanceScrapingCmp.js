import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import scrapeHTML from '@salesforce/apex/YahooFinanceScraping.scrapeHTML';
import insertStockData from '@salesforce/apex/YahooFinanceScraping.insertStockData';
import verifyDuplicates from '@salesforce/apex/YahooFinanceScraping.verifyDuplicates';
import scrapeHTMLAsync from '@salesforce/apex/YahooFinanceScraping.scrapeHTMLAsync';
import getJobsViaIDs from '@salesforce/apex/YahooFinanceScraping.getJobsViaIDs';
import {validate} from 'c/utilClass';


import SCRAPED_DATA from '@salesforce/schema/Stock_Data__c';
import TICKER_SYMBOL from '@salesforce/schema/Stock_Data__c.Ticker_Symbol__c';


import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';


export default class YahooFinanceScrapingCmp extends LightningElement {

	previousCloseDate = '2022-12-30';
	previousCloseDatePlusOneDay = '2022-12-31';
	@track date = '2023-01-03';
	dateWithOneMoreDay = '2023-01-04';
	today = new Date().toISOString().slice(0,10);

	title = 'Yahoo Finance Scraping';
	@track ticker = '';
	returnResult = [];
	@track options;
	selectedTickerList = [];

	isAsync;
	jobs = [];
	jobResults = [];

	stockDataList = [];

	@track showInputScreen = true;
	@track showScrapeResults = false;
	@track isLoading = false;
	@track showJobResult = false;


	@track stockColumns = [
		{ label: 'Ticker', fieldName: 'ticker', type: 'text', innerWidth: 30 },
		{ label: 'Industry ', fieldName: 'industry', type: 'text', innerWidth: 30 },
		{ label: 'Date', fieldName: 'givenDate', type: 'date', innerWidth: 30 },
		{ label: 'Open Price', fieldName: 'openPrice', type: 'number', innerWidth: 30 },
		{ label: 'Close Price', fieldName: 'closePrice', type: 'number', innerWidth: 30 },
		{ label: 'Previous Close Price', fieldName: 'previousClosePrice', type: 'number', innerWidth: 30 },
		{ label: 'Market Cap', fieldName: 'marketCap', type: 'text', innerWidth: 30 }
	];

	@track jobColumns = [
		{ label: 'Ticker', fieldName: 'ticker', type: 'text', innerWidth: 30 },
		{ label: 'Status', fieldName: 'status', type: 'text', innerWidth: 30 },
		{ label: 'Extended Status', fieldName: 'extendedStatus', type: 'text', innerWidth: 30 }
	];

	@track scrapedDataInsertResult = [];

	@wire(getObjectInfo, { objectApiName: SCRAPED_DATA })
	scrapedDataInfo;

	@wire(getPicklistValues, { recordTypeId: '$scrapedDataInfo.data.defaultRecordTypeId', fieldApiName: TICKER_SYMBOL })
	tickerPicklistValues({data, error}) {
		if(data) {

			this.options = data.values;

			this.options = this.options.map(item => {
				return {
					label: item.label,
					value: item.value
				}
			});
		}
		if(error) {
			console.log('error: ' + JSON.stringify(error));
			ShowToastEvent({
				title: 'Error',
				message: error.body.message,
				variant: 'error'
			});
		}
	}

	async verifyDuplicates() {
		console.log('verifying duplicates');
		this.loading = true;

		let duplicates = [];
		
		verifyDuplicates({ tickers: this.selectedTickerList, givenDateStr: this.date })
		  	.then((result) => {
				this.loading = false;

				result = result.map((item) => {
					console.log(item);
					duplicates.push(item.Ticker_Symbol__);
				});
			})
			.catch((error) => {
				this.isLoading = false;
				console.log('error: ' + error);
				console.log('error: ' + JSON.stringify(error));
				this.showErrorToast(error.body.message);
				throw error; // rethrow the error to propagate it to the caller
			});

			return duplicates.length > 0;
	}

	asyncScrape(){

		let previousCloseDateMiliseconds = this.convertDateToMiliseconds(this.previousCloseDate)/1000;
		let previousCloseDateMilisecondsPlusOneDay = this.convertDateToMiliseconds(this.previousCloseDatePlusOneDay)/1000;

		let dateInMiliseconds = this.convertDateToMiliseconds(this.date)/1000;		
		let dateWithOneMoreDayInMiliseconds = this.convertDateToMiliseconds(this.dateWithOneMoreDay)/1000;

		for (let i = 0; i < this.selectedTickerList.length; i++) {
			let ticker = this.selectedTickerList[i];

			scrapeHTMLAsync({ticker:ticker, givenDateMiliseconds:dateInMiliseconds, givenDateMilisecondsPlusOneDay:dateWithOneMoreDayInMiliseconds,
							previousWorkDayMiliseconds: previousCloseDateMiliseconds, previousWorkDayMilisecondsPlusOneDay:previousCloseDateMilisecondsPlusOneDay})
				.then(result =>{
					let jobID = result;
					console.log(jobID);
					this.jobs.push(jobID);
					this.jobResults.push({ticker: this.selectedTickerList[i], Id: jobID});

					this.isLoading = false;
				})
				.catch (error =>{
					this.isLoading = false;
					console.log('error: ' + error);
					console.log('error: ' + JSON.stringify(error));
					this.showErrorToast(error.body.message);
					this.stockDataList = [];		
				})
		}
		this.showSuccessToast('Scrape job(s) enqueued successfully!');

	}

	

	async handleScrapeButtonClick() {
		let listBox = this.template.querySelector('lightning-dual-listbox');
		
		try {
			//verifying if there are duplicates
			if(await this.verifyDuplicates()){
				this.showErrorToast('There are duplicate tickers for the selected date:'+ this.date);
				listBox.setCustomValidity(duplicates + ' already have data for the ' + this.date + ' date.');
				listBox.reportValidity();
			}else{
				listBox.setCustomValidity('');
				listBox.reportValidity();
				console.log('no duplicates');
			}

			//validating all input components for errors
			if(!validate(this.template)){
				this.showErrorToast('Please input all data');
				return;
			}

			console.log('selected tickers: '+this.selectedTickerList);

			//caling AuraEnabled in a loop to perform callouts in different transactions
			//to avoid hitting the heap memory limit
			//todo:
			//make callouts to send 4 tickers in a list to minimise duration
			this.isLoading = true;

			if(this.isAsync){
				this.asyncScrape();
				return;
			}

			for (let i = 0; i < this.selectedTickerList.length; i++) {
				try {
					let ticker = this.selectedTickerList[i];
					let result = await this.scrapeHTML(ticker);

					this.returnResult.push(result);
				} catch (error) {
					this.isLoading = false;
					console.log('error: ' + error);
					console.log('error: ' + JSON.stringify(error));
					this.showErrorToast(error.body.message);
				}
			}

			this.isLoading = false;
			this.selectedTickerList = [];
			this.scrapeResult();

		}catch(error){
			console.log(error);
		}
    }

	async scrapeHTML(ticker){

		let dateInMiliseconds = this.convertDateToMiliseconds(this.date)/1000;		
		let dateWithOneMoreDayInMiliseconds = this.convertDateToMiliseconds(this.dateWithOneMoreDay)/1000;

		return await scrapeHTML({ticker:ticker,givenDateMiliseconds: dateInMiliseconds,givenDateMilisecondsPlusOneDay : dateWithOneMoreDayInMiliseconds})
			.then(result => {
				return result;
			})

	}

	//method to insert stock data
	insertStockData(){
		this.isLoading = true;
		insertStockData({stockDataList: JSON.stringify(this.stockDataList)})
			.then(result => {
				this.isLoading = false;
				this.showSuccessToast('Stock Data Inserted Successfully');
				this.scrapedDataInsertResult = result;
				this.stockDataList = [];
				this.showResults();
			})
			.catch(error => {
				this.isLoading = false;
				console.log('error: ' + error);
				console.log('error: ' + JSON.stringify(error));
				this.showErrorToast(error.body.message);
				this.stockDataList = [];
			});
	}

	handleDateChange(event) {
		this.date = event.target.value;
		//add one more day to the date
		let date = new Date(this.date);
		date.setDate(date.getDate() + 1);
		this.dateWithOneMoreDay = date.toISOString().slice(0,10);
		date.setDate(date.getDate() - 2);

		let previousWorkDay = this.getPreviousWorkDay(date);
		this.previousCloseDate = previousWorkDay.toISOString().slice(0,10);
		previousWorkDay.setDate(previousWorkDay.getDate() + 1);
		this.previousCloseDatePlusOneDay = previousWorkDay.toISOString().slice(0,10);

		console.log('date+1: ' + this.dateWithOneMoreDay);
		console.log('previous close day: ' + this.previousCloseDate);

		//get the date in milliseconds
		let dateInMiliseconds = this.convertDateToMiliseconds(this.date);

		//check if the date is a weekend
		let isWeekend = this.isWeekend(dateInMiliseconds);
		
		//check if the date is a US holiday
		let isHoliday = this.isHoliday(dateInMiliseconds);

		console.log('isWeekend: ' + isWeekend);
		console.log('isHoliday: ' + isHoliday);

		if(isWeekend || isHoliday){
			event.target.setCustomValidity('Please select a valid date.');
			event.target.reportValidity();
			this.template.querySelector('lightning-button.scrapeButton').disabled = true;
		
			//reset the date
			this.date = null;
			this.dateWithOneMoreDay = null;
		}else{
			event.target.setCustomValidity('');
			event.target.reportValidity();

			this.template.querySelector('lightning-button.scrapeButton').disabled = false;
		}
	}
	
	//method to parse result
	scrapeResult(){
		this.loading = true;
		console.log('scraping...');

		try {
			for(let i = 0; i < this.returnResult.length; i++){

				console.log(i);
	
				let result = this.returnResult[i];
	
				let stockDataHtml = result.stockData;
				let companyInfoHtml = result.companyInfo;
				let marketCapHtml = result.marketCap;
	
				const parser = new DOMParser();
				const stockDataDoc = parser.parseFromString(stockDataHtml, 'text/html');
				const companyInfoDoc = parser.parseFromString(companyInfoHtml, 'text/html');
				const marketCapDoc = parser.parseFromString(marketCapHtml, 'text/html');
	
				let openPrice = stockDataDoc.querySelector("section > div.Pb\\(10px\\).Ovx\\(a\\).W\\(100\\%\\) > table > tbody > tr:nth-child(1) > td:nth-child(2) > span");
	
				let closePrice = stockDataDoc.querySelector("section > div.Pb\\(10px\\).Ovx\\(a\\).W\\(100\\%\\) > table > tbody > tr:nth-child(1) > td:nth-child(5) > span");
	
				let employeeNumber = companyInfoDoc.querySelector("section > div.asset-profile-container > div > div > p.D\\(ib\\).Va\\(t\\) > span:nth-child(8) > span");
	
				let companyInfo = companyInfoDoc.querySelector("section > div.asset-profile-container > div > div > p.D\\(ib\\).W\\(47\\.727\\%\\).Pend\\(40px\\)");
				const companyAddress = this.parseCompanyInfo(companyInfo.innerHTML);
	
				let industry = companyInfoDoc.querySelector("section > div.asset-profile-container > div > div > p.D\\(ib\\).Va\\(t\\) > span:nth-child(5)");
	
				let marketCap = marketCapDoc.querySelector("#quote-summary > div.D\\(ib\\).W\\(1\\/2\\).Bxz\\(bb\\).Pstart\\(12px\\).Va\\(t\\).ie-7_D\\(i\\).ie-7_Pos\\(a\\).smartphone_D\\(b\\).smartphone_W\\(100\\%\\).smartphone_Pstart\\(0px\\).smartphone_BdB.smartphone_Bdc\\(\\$seperatorColor\\) > table > tbody > tr:nth-child(1) > td.Ta\\(end\\).Fw\\(600\\).Lh\\(14px\\)");
	
				this.stockDataList.push({
					"ticker": result.ticker,
					"givenDate": this.date,
					"openPrice": openPrice.innerHTML,
					"closePrice": closePrice.innerHTML,
					"marketCap": marketCap.innerHTML,
					"employeeNumber": employeeNumber.innerHTML,
					"companyAddress": companyAddress,
					"industry": industry.innerHTML
				});
			}
		} catch (error) {
			console.log(error);
			console.log(JSON.stringify(error));
			this.showErrorToast(error.body);
		}
		
		this.loading = false;
		this.returnResult = [];

		this.insertStockData();
	}

	checkJobStatus(){

		//query 
	}


	//
	// HELPER METHODS
	//


	/**
	 * Selects all tickers from the options variable and assigns them to the selectedTickerList variable.
	 */
	handleSelectAllClick() {
		this.selectedTickerList = this.options.map(option => option.value);
	}

	handleDeselectAllClick() {
		this.selectedTickerList = [];
	}

	//queries the jobIds and showcases the results of those Queueable jobs
	handleCheckJobStatusClick() {

		this.isLoading = true;

		getJobsViaIDs({ jobIDs: this.jobs })
			.then(result => {
				this.jobResults = result.map(jobRes => {
	
					//get the matching job
					const jobResID = jobRes.Id.slice(0,15);

					const matchingJob = this.jobResults.find(job => {
						return job.Id.slice(0,15) === jobResID;
						
					});

					console.log('matchingJob ' +JSON.stringify(matchingJob));
					if (matchingJob) {
						return {
							Id: jobRes.Id,
							status: jobRes.Status,
							extendedStatus: jobRes.ExtendedStatus,
							ticker: matchingJob.ticker
						};
					}
				});

				this.showJobResults();
				this.isLoading = false;
			}).catch(error => {
				this.isLoading = false;
				console.log('error: ' + error);
				console.log('error: ' + JSON.stringify(error));
				this.showErrorToast(error.body.message);
			})
	}

	handleInputScreenButtonClick(){
		this.isLoading = true;
		this.showInputScreen = true;
		this.showScrapeResults = false;
		this.showJobResult = false;
		this.isLoading = false;
	}


	parseCompanyInfo(companyInfo){

		const companyInfoString = companyInfo.toString();

		const addressRegex = /([^<]+)<br>([^<]+)<br>([^<]+)<br>/;
		const addressMatch = companyInfoString.match(addressRegex);

		var companyAddress = null; 
		if(addressMatch){
			companyAddress = addressMatch[1] + ', ' + addressMatch[2] + ', ' + addressMatch[3];
		}
		console.log('companyAddress: ' + companyAddress);

		return companyAddress;
	}


	//showcase the results using stockDataList through lightning-datatable
	showResults(){
		this.isLoading = true;
		this.showInputScreen = false;
		this.showScrapeResults = true;
		this.isLoading = false;
	}

	/**
	 * Show the job results.
	 */
	showJobResults(){
		this.isLoading = true;
		this.showInputScreen = false;
		this.showJobResult = true;
		this.isLoading = false;
	}

	/**
	 * Handles the selection of a ticker.
	 */
	handleTickerSelection(event) {
		this.selectedTickerList = event.detail.value;
		console.log('selectedTickerList: ' + this.selectedTickerList);
	}

	//method to convert date to miliseconds
	convertDateToMiliseconds(date){
		return new Date(date).getTime();
	}

	showSuccessToast(message){
		this.dispatchEvent(
			new ShowToastEvent({
				title: 'Success',
				message: message,
				variant: 'success'
			})
		);
	}

	showErrorToast(message){
		this.dispatchEvent(
			new ShowToastEvent({
				title: 'Error',
				message: message,
				variant: 'error'
			})
		);
	}

	//isHoliday method
	isHoliday(dateInMiliseconds){
		let isHoliday = false;
		let holidays = [
			'1/1',
			'1/2',
			'1/16',
			'2/20',
			'5/29',
			'7/4',
			'9/4',
			'9/10',
			'10/7',
			'11/23',
			'12/25'
		];
		
		let date = new Date(dateInMiliseconds);
		console.log('date: ' + date);
		let month = date.getMonth() + 1;
		let day = date.getDate();

		console.log('month: ' + month);
		console.log('day: ' + day);
		let dateString = month + '/' + day;

		console.log(holidays.includes(dateString));
		if(holidays.includes(dateString)){
			return true;
		}

		return false;
	}

	//isWeekend method
	isWeekend(dateInMiliseconds){
		let date = new Date(dateInMiliseconds);
		let day = date.getDay();

		console.log('day: ' + day);

		if(day == 0 || day == 6){
			return true;
		}

		return false;
	}

	handleAsyncCheckbox(event){
		this.isAsync = event.detail.checked;

		if(!this.isAsync){
			this.template.querySelector('lightning-button.checkJobStatus').disabled = true;
		}else{
			this.template.querySelector('lightning-button.checkJobStatus').disabled = false;
		}
	}

 	getPreviousWorkDay(date) {

		let dateInMiliseconds = this.convertDateToMiliseconds(date.toISOString().slice(0,10));
		console.log(dateInMiliseconds);

		//check if the date is a weekend
		let isWeekend = this.isWeekend(dateInMiliseconds);
		
		//check if the date is a US holiday
		let isHoliday = this.isHoliday(dateInMiliseconds);
		console.log('isWeekend: ' + isWeekend);
		console.log('isHoliday: ' + isHoliday);
		
		while(!!isHoliday || !!isWeekend){	
			date.setDate(date.getDate()-1);

			dateInMiliseconds = this.convertDateToMiliseconds(date.toISOString().slice(0,10));

			//check if the date is a weekend
			isWeekend = this.isWeekend(dateInMiliseconds);
			
			//check if the date is a US holiday
			isHoliday = this.isHoliday(dateInMiliseconds);

			console.log('isWeekend: ' + isWeekend);
			console.log('isHoliday: ' + isHoliday);
			
		}

		return date;		
	}


}