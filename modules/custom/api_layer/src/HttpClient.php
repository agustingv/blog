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
        $cacheData = null;
        $cacheExpire = time() + (60 * 60 * 12);
        try {

            $cid = md5($url);
            $cacheData = $this->cacheBackend->get($cid);
            if (isset($cacheData->data))
            {
                return Json::decode($cacheData->data);
            }

            $options = [
                'connect_timeout' => 2,
                'timeout' => 2
            ];
            $response = $this->http_client->get($url, $options);

            if ($response->getStatuscode() == 200)
            {
                $resource = $response->getBody()->getContents();
                $this->cacheBackend->set($cid, $resource, $cacheExpire);
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