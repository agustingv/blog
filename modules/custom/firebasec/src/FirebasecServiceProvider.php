<?php

namespace Drupal\firebasec;

use Drupal\Core\DependencyInjection\ContainerBuilder;
use Drupal\Core\DependencyInjection\ServiceProviderBase;
use Symfony\Component\DependencyInjection\Definition;
use Symfony\Component\Finder\Finder;
use Drupal\firebasec\FirebaseFactory;

class FirebasecServiceProvider extends ServiceProviderBase
{

    public function register(
        ContainerBuilder $container
    ) : void
    {

        $config = $container->getParameter('firebase.config');
        foreach ($config['projects'] as $projectName => $projectConfiguration) {
            $this->processProjectConfiguration($projectName, $projectConfiguration, $container);
        }
    }

    private function processProjectConfiguration(
        string $name, 
        array $config, 
        ContainerBuilder $container
        ) : void
    {
        $this->registerService(
            name: $name, 
            postfix: 'database', 
            config: $config, 
            contract: \Firebase\Contract\Database::class, 
            container: $container, 
            method: 'createDatabase'
        );

        $this->registerService(
            name: $name, 
            postfix: 'auth', 
            config: $config, 
            contract: \Firebase\Contract\Auth::class, 
            container: $container, 
            method: 'createAuth'
        );
        $this->registerService($name, 'storage', $config, \Firebase\Contract\Storage::class, $container, 'createStorage');
        $this->registerService($name, 'remote_config', $config, \Firebase\Contract\RemoteConfig::class, $container, 'createRemoteConfig');
        $this->registerService($name, 'messaging', $config, \Firebase\Contract\Messaging::class, $container, 'createMessaging');
        $this->registerService($name, 'firestore', $config, \Firebase\Contract\Firestore::class, $container, 'createFirestore');
        $this->registerService($name, 'dynamic_links', $config, \Firebase\Contract\DynamicLinks::class, $container, 'createDynamicLinksService');        
    }

    public function getAlias(): string
    {
        return 'drupal_firebase';
    }

    private function registerService(
        string $name, 
        string $postfix, 
        array $config, 
        string $contract, 
        ContainerBuilder $container, 
        string $method = 'create'
    ) : void 
    {

        $projectServiceId = \sprintf('%s.%s.%s', $this->getAlias(), $name, $postfix);
        $isPublic = $config['public'];

        $factory = new Definition(FirebaseFactory::class);
        $factory->setPublic(false);

        if ($config['verifier_cache'] ?? null) {
            $factory->addMethodCall('setVerifierCache', [new Reference($config['verifier_cache'])]);
        }

        if ($config['auth_token_cache'] ?? null) {
            $factory->addMethodCall('setAuthTokenCache', [new Reference($config['auth_token_cache'])]);
        }

        if ($config['http_request_logger'] ?? null) {
            $factory->addMethodCall('setHttpRequestLogger', [new Reference($config['http_request_logger'])]);
        }

        if ($config['http_request_debug_logger'] ?? null) {
            $factory->addMethodCall('setHttpRequestDebugLogger', [new Reference($config['http_request_debug_logger'])]);
        }

        $container->register($projectServiceId, $contract)
        ->setFactory([$factory, $method])
        ->addArgument($config)
        ->setPublic($isPublic);
    }
}