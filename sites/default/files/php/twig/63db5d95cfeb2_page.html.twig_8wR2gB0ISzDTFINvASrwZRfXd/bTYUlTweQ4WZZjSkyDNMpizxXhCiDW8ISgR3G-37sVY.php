<?php

use Twig\Environment;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Extension\SandboxExtension;
use Twig\Markup;
use Twig\Sandbox\SecurityError;
use Twig\Sandbox\SecurityNotAllowedTagError;
use Twig\Sandbox\SecurityNotAllowedFilterError;
use Twig\Sandbox\SecurityNotAllowedFunctionError;
use Twig\Source;
use Twig\Template;

/* themes/contrib/bootstrap5/templates/layout/page.html.twig */
class __TwigTemplate_e94b464e35322d04f29397f910172d18 extends Template
{
    private $source;
    private $macros = [];

    public function __construct(Environment $env)
    {
        parent::__construct($env);

        $this->source = $this->getSourceContext();

        $this->parent = false;

        $this->blocks = [
        ];
        $this->sandbox = $this->env->getExtension('\Twig\Extension\SandboxExtension');
        $this->checkSecurity();
    }

    protected function doDisplay(array $context, array $blocks = [])
    {
        $macros = $this->macros;
        // line 46
        $context["nav_classes"] = ((("navbar navbar-expand-lg" . (((        // line 47
($context["b5_navbar_schema"] ?? null) != "none")) ? ((" navbar-" . $this->sandbox->ensureToStringAllowed(($context["b5_navbar_schema"] ?? null), 47, $this->source))) : (" "))) . (((        // line 48
($context["b5_navbar_schema"] ?? null) != "none")) ? ((((($context["b5_navbar_schema"] ?? null) == "dark")) ? (" text-light") : (" text-dark"))) : (" "))) . (((        // line 49
($context["b5_navbar_bg_schema"] ?? null) != "none")) ? ((" bg-" . $this->sandbox->ensureToStringAllowed(($context["b5_navbar_bg_schema"] ?? null), 49, $this->source))) : (" ")));
        // line 51
        echo "
";
        // line 53
        $context["footer_classes"] = (((" " . (((        // line 54
($context["b5_footer_schema"] ?? null) != "none")) ? ((" footer-" . $this->sandbox->ensureToStringAllowed(($context["b5_footer_schema"] ?? null), 54, $this->source))) : (" "))) . (((        // line 55
($context["b5_footer_schema"] ?? null) != "none")) ? ((((($context["b5_footer_schema"] ?? null) == "dark")) ? (" text-light") : (" text-dark"))) : (" "))) . (((        // line 56
($context["b5_footer_bg_schema"] ?? null) != "none")) ? ((" bg-" . $this->sandbox->ensureToStringAllowed(($context["b5_footer_bg_schema"] ?? null), 56, $this->source))) : (" ")));
        // line 58
        echo "
<header>
  ";
        // line 60
        echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "header", [], "any", false, false, true, 60), 60, $this->source), "html", null, true);
        echo "

  ";
        // line 62
        if (((twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "nav_branding", [], "any", false, false, true, 62) || twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "nav_main", [], "any", false, false, true, 62)) || twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "nav_additional", [], "any", false, false, true, 62))) {
            // line 63
            echo "  <nav class=\"";
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(($context["nav_classes"] ?? null), 63, $this->source), "html", null, true);
            echo "\">
    <div class=\"";
            // line 64
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(($context["b5_top_container"] ?? null), 64, $this->source), "html", null, true);
            echo " d-flex\">
      ";
            // line 65
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "nav_branding", [], "any", false, false, true, 65), 65, $this->source), "html", null, true);
            echo "

      <button class=\"navbar-toggler collapsed\" type=\"button\" data-bs-toggle=\"collapse\"
              data-bs-target=\"#navbarSupportedContent\" aria-controls=\"navbarSupportedContent\"
              aria-expanded=\"false\" aria-label=\"Toggle navigation\">
        <span class=\"navbar-toggler-icon\"></span>
      </button>

      <div class=\"collapse navbar-collapse justify-content-md-end\" id=\"navbarSupportedContent\">
        ";
            // line 74
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "nav_main", [], "any", false, false, true, 74), 74, $this->source), "html", null, true);
            echo "
        ";
            // line 75
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "nav_additional", [], "any", false, false, true, 75), 75, $this->source), "html", null, true);
            echo "
      </div>
    </div>
  </nav>
  ";
        }
        // line 80
        echo "
</header>

<main role=\"main\">
  <a id=\"main-content\" tabindex=\"-1\"></a>";
        // line 85
        echo "
  ";
        // line 87
        $context["sidebar_first_classes"] = (((twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "sidebar_first", [], "any", false, false, true, 87) && twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "sidebar_second", [], "any", false, false, true, 87))) ? ("col-12 col-sm-6 col-lg-3") : ("col-12 col-lg-3"));
        // line 89
        echo "
  ";
        // line 91
        $context["sidebar_second_classes"] = (((twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "sidebar_first", [], "any", false, false, true, 91) && twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "sidebar_second", [], "any", false, false, true, 91))) ? ("col-12 col-sm-6 col-lg-3") : ("col-12 col-lg-3"));
        // line 93
        echo "
  ";
        // line 95
        $context["content_classes"] = (((twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "sidebar_first", [], "any", false, false, true, 95) && twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "sidebar_second", [], "any", false, false, true, 95))) ? ("col-12 col-lg-6") : ((((twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "sidebar_first", [], "any", false, false, true, 95) || twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "sidebar_second", [], "any", false, false, true, 95))) ? ("col-12 col-lg-9") : ("col-12"))));
        // line 97
        echo "

  <div class=\"";
        // line 99
        echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(($context["b5_top_container"] ?? null), 99, $this->source), "html", null, true);
        echo "\">
    ";
        // line 100
        if (twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "breadcrumb", [], "any", false, false, true, 100)) {
            // line 101
            echo "      ";
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "breadcrumb", [], "any", false, false, true, 101), 101, $this->source), "html", null, true);
            echo "
    ";
        }
        // line 103
        echo "    <div class=\"row g-0\">
      ";
        // line 104
        if (twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "sidebar_first", [], "any", false, false, true, 104)) {
            // line 105
            echo "        <div class=\"order-2 order-lg-1 ";
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(($context["sidebar_first_classes"] ?? null), 105, $this->source), "html", null, true);
            echo "\">
          ";
            // line 106
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "sidebar_first", [], "any", false, false, true, 106), 106, $this->source), "html", null, true);
            echo "
        </div>
      ";
        }
        // line 109
        echo "      ";
        if (twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "content_header", [], "any", false, false, true, 109)) {
            // line 110
            echo "        ";
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "content_header", [], "any", false, false, true, 110), 110, $this->source), "html", null, true);
            echo "
      ";
        }
        // line 112
        echo "      <div class=\"order-1 order-lg-2 ";
        echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(($context["content_classes"] ?? null), 112, $this->source), "html", null, true);
        echo "\">
        ";
        // line 113
        echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "content", [], "any", false, false, true, 113), 113, $this->source), "html", null, true);
        echo "
      </div>
      ";
        // line 115
        if (twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "sidebar_second", [], "any", false, false, true, 115)) {
            // line 116
            echo "        <div class=\"order-3 ";
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(($context["sidebar_second_classes"] ?? null), 116, $this->source), "html", null, true);
            echo "\">
          ";
            // line 117
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "sidebar_second", [], "any", false, false, true, 117), 117, $this->source), "html", null, true);
            echo "
        </div>
      ";
        }
        // line 120
        echo "    </div>
  </div>

</main>

";
        // line 125
        if (twig_get_attribute($this->env, $this->source, ($context["page"] ?? null), "footer", [], "any", false, false, true, 125)) {
            // line 126
            echo "<footer class=\"footer\">
  <div class=\"row primary\">
    <div class=\"column about\">
      <h3>Grouñidos en la red</h3>
      <p>Desde el momento en que cogí su libro me caí al suelo rodando de risa. Algún día espero leerlo.</p>
    </div>
    <div class=\"column links\">  
      <h3>Información sobre el sitio</h3>
      <ul>
        <li><a href=\"/cookies\">Política de cookies</a></li>
        <li><a href=\"#terms-of-services\">Terms Of Service</a></li>
      </ul>
    </div>
    <div class=\"column subscribe\">
      <h3>Newsletter</h3>
        <div>
          <input type=\"email\" placeholder=\"Your email id here\" />
          <button>Subscribe</button>
        </div>
    </div>
  </div>
  <div class=\"row copyright\">
    <div class=\"footer-menu\">
      <a href=\"\">Inicio</a>
      <a href=\"\">About</a>
      <a href=\"\">Contact</a>
    </div>
    <p>Copyright &copy; 2023 Grouñidos en la red</p>
  </div>
</footer>

";
        }
    }

    public function getTemplateName()
    {
        return "themes/contrib/bootstrap5/templates/layout/page.html.twig";
    }

    public function isTraitable()
    {
        return false;
    }

    public function getDebugInfo()
    {
        return array (  190 => 126,  188 => 125,  181 => 120,  175 => 117,  170 => 116,  168 => 115,  163 => 113,  158 => 112,  152 => 110,  149 => 109,  143 => 106,  138 => 105,  136 => 104,  133 => 103,  127 => 101,  125 => 100,  121 => 99,  117 => 97,  115 => 95,  112 => 93,  110 => 91,  107 => 89,  105 => 87,  102 => 85,  96 => 80,  88 => 75,  84 => 74,  72 => 65,  68 => 64,  63 => 63,  61 => 62,  56 => 60,  52 => 58,  50 => 56,  49 => 55,  48 => 54,  47 => 53,  44 => 51,  42 => 49,  41 => 48,  40 => 47,  39 => 46,);
    }

    public function getSourceContext()
    {
        return new Source("{#
/**
 * @file
 * Theme override to display a single page.
 *
 * The doctype, html, head and body tags are not in this template. Instead they
 * can be found in the html.html.twig template in this directory.
 *
 * Available variables:
 *
 * General utility variables:
 * - base_path: The base URL path of the Drupal installation. Will usually be
 *   \"/\" unless you have installed Drupal in a sub-directory.
 * - is_front: A flag indicating if the current page is the front page.
 * - logged_in: A flag indicating if the user is registered and signed in.
 * - is_admin: A flag indicating if the user has permission to access
 *   administration pages.
 *
 * Site identity:
 * - front_page: The URL of the front page. Use this instead of base_path when
 *   linking to the front page. This includes the language domain or prefix.
 *
 * Page content (in order of occurrence in the default page.html.twig):
 * - node: Fully loaded node, if there is an automatically-loaded node
 *   associated with the page and the node ID is the second argument in the
 *   page's path (e.g. node/12345 and node/12345/revisions, but not
 *   comment/reply/12345).
 *
 * Regions:
 * - page.header: Items for the header region.
 * - page.primary_menu: Items for the primary menu region.
 * - page.secondary_menu: Items for the secondary menu region.
 * - page.highlighted: Items for the highlighted content region.
 * - page.help: Dynamic help text, mostly for admin pages.
 * - page.content: The main content of the current page.
 * - page.sidebar_first: Items for the first sidebar.
 * - page.sidebar_second: Items for the second sidebar.
 * - page.footer: Items for the footer region.
 * - page.breadcrumb: Items for the breadcrumb region.
 *
 * @see template_preprocess_page()
 * @see html.html.twig
 */
#}
{%
set nav_classes = 'navbar navbar-expand-lg' ~
  (b5_navbar_schema != 'none' ? \" navbar-#{b5_navbar_schema}\" : ' ') ~
  (b5_navbar_schema != 'none' ? (b5_navbar_schema == 'dark' ? ' text-light' : ' text-dark' ) : ' ') ~
  (b5_navbar_bg_schema != 'none' ? \" bg-#{b5_navbar_bg_schema}\" : ' ')
%}

{%
set footer_classes = ' ' ~
  (b5_footer_schema != 'none' ? \" footer-#{b5_footer_schema}\" : ' ') ~
  (b5_footer_schema != 'none' ? (b5_footer_schema == 'dark' ? ' text-light' : ' text-dark' ) : ' ') ~
  (b5_footer_bg_schema != 'none' ? \" bg-#{b5_footer_bg_schema}\" : ' ')
%}

<header>
  {{ page.header }}

  {% if page.nav_branding or page.nav_main or page.nav_additional %}
  <nav class=\"{{ nav_classes }}\">
    <div class=\"{{ b5_top_container }} d-flex\">
      {{ page.nav_branding }}

      <button class=\"navbar-toggler collapsed\" type=\"button\" data-bs-toggle=\"collapse\"
              data-bs-target=\"#navbarSupportedContent\" aria-controls=\"navbarSupportedContent\"
              aria-expanded=\"false\" aria-label=\"Toggle navigation\">
        <span class=\"navbar-toggler-icon\"></span>
      </button>

      <div class=\"collapse navbar-collapse justify-content-md-end\" id=\"navbarSupportedContent\">
        {{ page.nav_main }}
        {{ page.nav_additional }}
      </div>
    </div>
  </nav>
  {% endif %}

</header>

<main role=\"main\">
  <a id=\"main-content\" tabindex=\"-1\"></a>{# link is in html.html.twig #}

  {%
  set sidebar_first_classes = (page.sidebar_first and page.sidebar_second) ? 'col-12 col-sm-6 col-lg-3' : 'col-12 col-lg-3'
  %}

  {%
  set sidebar_second_classes = (page.sidebar_first and page.sidebar_second) ? 'col-12 col-sm-6 col-lg-3' : 'col-12 col-lg-3'
  %}

  {%
  set content_classes = (page.sidebar_first and page.sidebar_second) ? 'col-12 col-lg-6' : ((page.sidebar_first or page.sidebar_second) ? 'col-12 col-lg-9' : 'col-12' )
   %}


  <div class=\"{{ b5_top_container }}\">
    {% if page.breadcrumb %}
      {{ page.breadcrumb }}
    {% endif %}
    <div class=\"row g-0\">
      {% if page.sidebar_first %}
        <div class=\"order-2 order-lg-1 {{ sidebar_first_classes }}\">
          {{ page.sidebar_first }}
        </div>
      {% endif %}
      {% if page.content_header %}
        {{ page.content_header }}
      {% endif %}
      <div class=\"order-1 order-lg-2 {{ content_classes }}\">
        {{ page.content }}
      </div>
      {% if page.sidebar_second %}
        <div class=\"order-3 {{ sidebar_second_classes }}\">
          {{ page.sidebar_second }}
        </div>
      {% endif %}
    </div>
  </div>

</main>

{% if page.footer %}
<footer class=\"footer\">
  <div class=\"row primary\">
    <div class=\"column about\">
      <h3>Grouñidos en la red</h3>
      <p>Desde el momento en que cogí su libro me caí al suelo rodando de risa. Algún día espero leerlo.</p>
    </div>
    <div class=\"column links\">  
      <h3>Información sobre el sitio</h3>
      <ul>
        <li><a href=\"/cookies\">Política de cookies</a></li>
        <li><a href=\"#terms-of-services\">Terms Of Service</a></li>
      </ul>
    </div>
    <div class=\"column subscribe\">
      <h3>Newsletter</h3>
        <div>
          <input type=\"email\" placeholder=\"Your email id here\" />
          <button>Subscribe</button>
        </div>
    </div>
  </div>
  <div class=\"row copyright\">
    <div class=\"footer-menu\">
      <a href=\"\">Inicio</a>
      <a href=\"\">About</a>
      <a href=\"\">Contact</a>
    </div>
    <p>Copyright &copy; 2023 Grouñidos en la red</p>
  </div>
</footer>

{% endif %}
", "themes/contrib/bootstrap5/templates/layout/page.html.twig", "/var/www/themes/contrib/bootstrap5/templates/layout/page.html.twig");
    }
    
    public function checkSecurity()
    {
        static $tags = array("set" => 46, "if" => 62);
        static $filters = array("escape" => 60);
        static $functions = array();

        try {
            $this->sandbox->checkSecurity(
                ['set', 'if'],
                ['escape'],
                []
            );
        } catch (SecurityError $e) {
            $e->setSourceContext($this->source);

            if ($e instanceof SecurityNotAllowedTagError && isset($tags[$e->getTagName()])) {
                $e->setTemplateLine($tags[$e->getTagName()]);
            } elseif ($e instanceof SecurityNotAllowedFilterError && isset($filters[$e->getFilterName()])) {
                $e->setTemplateLine($filters[$e->getFilterName()]);
            } elseif ($e instanceof SecurityNotAllowedFunctionError && isset($functions[$e->getFunctionName()])) {
                $e->setTemplateLine($functions[$e->getFunctionName()]);
            }

            throw $e;
        }

    }
}
