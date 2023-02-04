<?php

namespace Drupal\api_layer;

use Drupal\Core\Cache\CacheBackendInterface;
use GuzzleHttp\Client;
use Drupal\Component\Serialization\Json;

class HttpClient 
{

    public function __construct(
        private Client $http_client, 
        private CacheBackendInterface $cacheBackend) 
    {}

    public function get(
        string $url,
        array $options = []) : array
    {
        $resource = "";
        try {

            $response = $this->http_client->get($url);


            if ($response->getStatuscode() == 200)
            {
                $resource = $response->getBody()->getContents();
                $resource = Json::decode($resource);
            }
            else 
            {
                throw new \RuntimeException('Error while consuming API. Error code: ' . $response->getStatusCode());
            }

        } catch (\RuntimeException $e) {
            watchdog_exception(__METHOD__, $e);
        }

        return $resource;
    }

}