#!/usr/bin/env php
<?php

require __DIR__.'/vendor/autoload.php';

use Symfony\Component\Console\Application;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Output\OutputInterface;

$application = new Application();
$application
	->register('json:update')
	->setDescription('Create a new data set')
	->addArgument(
		'token',
		InputArgument::REQUIRED,
		'Contentful token'
	)
	->addArgument(
		'space',
		InputArgument::REQUIRED,
		'Contentful space id'
	)
	->addArgument(
		'content-type',
		InputArgument::REQUIRED,
		'Contentful content type id'
	)
	->addArgument(
		'image-folder',
		InputArgument::REQUIRED,
		'Folder for images'
	)
	->setCode(function(InputInterface $input, OutputInterface $output) {
		$token = $input->getArgument('token');
		$space = $input->getArgument('space');
		$imageFolder = realpath($input->getArgument('image-folder'));
		$locale = 'da-DK';

		$client = new \Contentful\Delivery\Client($token, $space);
		$query = new \Contentful\Delivery\Query();
		$query->setInclude(10);
		$query->setLimit(1000);
		$query->setContentType($input->getArgument('content-type'));

		$entries = $client->getEntries($query);

		$fieldMapping = [
			'tags' => [
				'properties' => [
					'name' => 'name'
				]
			],
			'gameCategory' => [
				'properties' => [
					'category' => 'name'
				]
			],
			'gameArea' => [
				'properties' => [
					'area' => 'area'
				]
			],
			'images' => [
				'properties' => [
					'image' => 'image'
				]
			],
			'image' => [
				'properties' => [
					'file' => 'file'
				]
			],
			'file' => [
				'properties' => [
					'file' => 'url'
				]
			]
		];

		$field = function($fieldName, \Contentful\Delivery\DynamicEntry $entry) use ($fieldMapping, &$field, $locale) {
			try {
				$contentTypeField = $entry->getContentType()->getField($fieldName);


				if ($contentTypeField !== NULL) {
					$type = $contentTypeField->getType();
				} else {
					$type = NULL;
				}

				$methodName = 'get' . ucfirst($fieldName);
				/** @var \Contentful\Delivery\ContentTypeField $value */
				$value = $entry->$methodName($locale);

				switch ($type) {
					case 'Text':
						return trim($value);
						break;

					case 'Integer':
						return (int) trim($value);
						break;

					case 'Array':
						$arrayValues = [];
						if (count($value) < 1) {
							return [];
						}

						/** @var \Contentful\Delivery\DynamicEntry $childItem */
						foreach ($value as $childItem) {
							$childContentName = $childItem->getContentType()->getId();

							if (array_key_exists($childContentName, $fieldMapping)) {
								$properties = $fieldMapping[$childContentName]['properties'];
								$childValues['id'] = $field('id', $childItem);
								foreach ($properties as $propertyKey => $returnKey) {
									$childFieldValue = $field($propertyKey, $childItem);

									$childValues[$returnKey] = $childFieldValue;
								}
								$arrayValues[] = $childValues;
							}
						}
						return $arrayValues;
						break;

					case 'Link':
						return 'Link object';
						break;

					default:
						return (string) $value;
				}
			} catch (\Exception $exception) {
				return NULL;
			}

		};

		$images = function($fieldName, \Contentful\Delivery\DynamicEntry $entry) use ($fieldMapping, $locale, $imageFolder) {
			$imageFormats = [
				'list' => [
					'w' => 800,
					'h' => 400,
					'fit' => 'fill'
				],
				'detail' => [
					'w' => 720,
					'h' => 405,
					'fit' => 'fill',
					'f' => 'faces'
				]
			];
			$methodName = 'get' . ucfirst($fieldName);

			$assets = $entry->$methodName();

			if (count($assets) === 0) {
				return [];
			}

			$images = [];
			/** @var \Contentful\Delivery\DynamicEntry $asset */
			foreach ($assets as $asset) {
				try {
					$client = new \GuzzleHttp\Client();
					$fileName = $asset->getImage()->getFile()->getFileName();
					$fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
					$formats = [];
					foreach ($imageFormats as $formatName => $imageFormat) {
						$url = $asset->getImage()->getFile()->getUrl() . '?' . \GuzzleHttp\Psr7\build_query($imageFormat);
						$persistedFileName = md5($url) . '.' . $fileExtension;
						$persistedFilePath = $imageFolder . DIRECTORY_SEPARATOR . $persistedFileName;
						if (!file_exists($persistedFilePath)) {
							$client->request('GET', $url, ['sink' =>  $persistedFilePath]);
						}
						$formats[$formatName] = $persistedFileName;
					}
					$images[] = $formats;
				} catch (\Exception $exception) {

				}
			}
			return $images;
		};

		$youtube = function($fieldName, \Contentful\Delivery\DynamicEntry $entry) use ($fieldMapping, $locale) {
			$methodName = 'get' . ucfirst($fieldName);

			$assets = $entry->$methodName();

			$videos = [];
			/** @var \Contentful\Delivery\DynamicEntry $asset */
			foreach ($assets as $asset) {
				try {
					$videos[] = $asset->getYoutubeId();
				} catch (\Exception $exception) {

				}
			}
			return $videos;
		};

		$slugify = function($string) {
			$value = mb_strtolower($string);
			$transliteration = array(
				'ä' => 'ae',
				'ö' => 'oe',
				'ü' => 'ue',
				'ß' => 'ss',
				'å' => 'aa',
				'ø' => 'oe',
				'æ' => 'ae'
			);
			$value = strtr($value, $transliteration);

			$spaceCharacter = '-';
			$value = preg_replace('/[ \-+_]+/', $spaceCharacter, $value);

			$value = preg_replace('/[^-a-z0-9.\\' . $spaceCharacter . ']/i', '', $value);

			$value = preg_replace('/\\' . $spaceCharacter . '{2,}/', $spaceCharacter, $value);
			$value = trim($value, $spaceCharacter);

			return $value;
		};
		$data = [];

		/** @var \Contentful\Delivery\DynamicEntry $entry */
		foreach ($entries as $entry) {
			try {
				$data[] = [
					'id' => $field('id', $entry),
					'name' => $field('name', $entry),
					'teaser' => $field('teaser', $entry),
					'description' => $field('description', $entry),
					'min_participants' => $field('participantsMin', $entry),
					'max_participants' => $field('participantsMax', $entry),
					'min_age' => $field('ageMin', $entry),
					'max_age' => $field('ageMax', $entry),
					'min_time' => $field('durationMin', $entry),
					'max_time' => $field('durationMax', $entry),
					'inside' =>  (boolean) $field('indoor', $entry) ? TRUE : FALSE,
					'outdoor' => (boolean) $field('outdoor', $entry) ? TRUE : FALSE,
					'area' => $field('gameArea', $entry),
					'videos' => $youtube('videos', $entry),
					'tags' => $field('tags', $entry),
					'game_categories' => $field('gameCategory', $entry),
					'url' => $slugify($field('name', $entry)),
					'images' => $images('images', $entry)
				];
			} catch (\Exception $exception) {
			}
		}
		$output->writeln(json_encode($data));
	});
$application->run();

