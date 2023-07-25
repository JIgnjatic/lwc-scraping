global with sharing class YahooFinanceScrapingMock implements HttpCalloutMock{
    

    global HTTPResponse respond(HTTPRequest req) {
        // Create a fake response.
        // Set response values, and 
        // return response.

        String htmlSuccess = '<html></html>';

        String historicDataUrl = '/history?period1=';
        String marketCapURL = '/profile?p=';
        String companyInfoUrl = '?p=';

        String endpoint = req.getEndpoint();

        System.debug(req.getEndpoint());
        System.debug(endpoint);
        System.debug(historicDataUrl);
        

        if (endpoint.contains(historicDataUrl) || endpoint.contains(marketCapURL) || endpoint.contains(companyInfoUrl)) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setBody(htmlSuccess);
            res.setStatusCode(200);
            return res;
        }else {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setBody('Bad Request');
            res.setStatusCode(400);
            return res;
        }
    }
}