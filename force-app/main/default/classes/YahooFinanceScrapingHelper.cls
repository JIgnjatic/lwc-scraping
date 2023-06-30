public with sharing class YahooFinanceScrapingHelper {
    
    
    public static YahooFinanceScraping.YahooFinanceHTMLWrapper makeCallout(List<String> urls){

        YahooFinanceScraping.YahooFinanceHTMLWrapper yfw = new YahooFinanceScraping.YahooFinanceHTMLWrapper();
        HttpResponse response;

        for(Integer i=0; i<3; i++){

            try {

                HttpRequest request = new HttpRequest();
                Http http = new Http();

                request.setEndpoint(urls[i]);
                request.setMethod('GET');

                response = http.send(request);


                if (response.getStatusCode() == 200) {

                    if(i==0){
                        yfw.stockData = response.getBody();
                    }else if(i==1){
                        yfw.companyInfo = response.getBody();
                    }else if(i==2){
                        yfw.marketCap = response.getBody();
                    }
                } 

            } catch (Exception e) {
                throw new AuraHandledException('Failed to retrieve HTML. Status code: ' + response.getStatusCode() + ' Response: ' + response.getBody());
            }
        }

        return yfw;
    }
}