import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import scrapeHTML from '@salesforce/apex/YahooFinanceScraping.scrapeHTML';
import insertStockData from '@salesforce/apex/YahooFinanceScraping.insertStockData';
import verifyDuplicates from '@salesforce/apex/YahooFinanceScraping.verifyDuplicates';
import {validate} from 'c/utilClass';


import SCRAPED_DATA from '@salesforce/schema/Stock_Data__c';
import TICKER_SYMBOL from '@salesforce/schema/Stock_Data__c.Ticker_Symbol__c';


import { getPicklistValues } from 'lightning/uiObjectInfoApi';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';


export default class YahooFinanceScrapingCmp extends LightningElement {

	@track date = '2023-01-03';
	dateWithOneMoreDay = '2023-01-04';
	today = new Date().toISOString().slice(0,10);

	title = 'Yahoo Finance Scraping';
	@track ticker = '';
	returnResult = [];
	@track options;
	selectedTickerList = [];

	stockDataList = [];

	@track showInputScreen = true;
	@track showScrapeResults = false;
	@track isLoading = false;


	@track columns = [
		{ label: 'Ticker', fieldName: 'ticker', type: 'text', innerWidth: 30 },
		{ label: 'Industry ', fieldName: 'industry', type: 'text', innerWidth: 30 },
		{ label: 'Date', fieldName: 'givenDate', type: 'date', innerWidth: 30 },
		{ label: 'Open Price', fieldName: 'openPrice', type: 'number', innerWidth: 30 },
		{ label: 'Close Price', fieldName: 'closePrice', type: 'number', innerWidth: 30 },
		{ label: 'Market Cap', fieldName: 'marketCap', type: 'text', innerWidth: 30 }
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
		console.log(this.date);

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

			this.isLoading = true;
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

		console.log('date+1: ' + this.dateWithOneMoreDay);

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
	
				let stockData = stockDataDoc.querySelector("section > div.Pb\\(10px\\).Ovx\\(a\\).W\\(100\\%\\) > table > tbody > tr:nth-child(1) > td.Py\\(10px\\).Ta\\(start\\).Pend\\(10px\\) > span");
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
			console.log(JSON.stringify(error));
			this.showErrorToast(error.body);
		}
		
		this.loading = false;
		this.returnResult = [];

		this.insertStockData();
	}



	//
	// HELPER METHODS
	//


	handleInputScreenButtonClick(){
		this.isLoading = true;
		this.showInputScreen = true;
		this.showScrapeResults = false;
		this.isLoading = false;
	}


	parseCompanyInfo(companyInfo){

		const companyInfoString = companyInfo.toString();

		const addressRegex = /(.+)<br>([^<]+), ([A-Z]{2}) (\d{5}(?:-\d{4})?)<br>([^<]+)<br>/;
		const addressMatch = companyInfoString.match(addressRegex);

		const companyAddress = addressMatch[1] + ', ' + addressMatch[2] + ', ' + addressMatch[3] + ', ' + addressMatch[4] + ', ' + addressMatch[5];
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

	connectedCallback(){
		console.log('connectedCallback');

	}

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


		if(holidays.includes(dateString)){
			isHoliday = true;
		}

		return isHoliday;
	}

	//isWeekend method
	isWeekend(dateInMiliseconds){
		let isWeekend = false;
		let date = new Date(dateInMiliseconds);
		let day = date.getDay();

		console.log('day: ' + day);

		if(day == 0 || day == 6){
			isWeekend = true;
		}

		return isWeekend;
	}


}