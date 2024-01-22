response = requests.get(URL + ':' + PORT + '/health', timeout=TIMEOUT)
if response.status_code == requests.codes.ok:
    logging.info(
        f'Health check {URL}: HTTP status code {response.status_code}')
    exit(0)
else:
    logging.error(
        f'Health check {URL}: HTTP status code {response.status_code}')
    exit(1)
